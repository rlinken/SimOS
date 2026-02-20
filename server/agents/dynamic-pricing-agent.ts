import { db } from "@db";
import { bayRentalOffers, bookings, bays, events } from "@db/schema";
import { eq, and, between, sql, gte, lte } from "drizzle-orm";

/**
 * Dynamic Pricing Agent
 *
 * Responsibilities:
 * - Optimize bay rental pricing based on demand patterns
 * - Implement surge pricing during peak hours
 * - Suggest promotional pricing for low-demand periods
 * - Analyze historical booking data to predict demand
 * - Adjust prices for special events and tournaments
 * - Calculate optimal pricing to maximize revenue
 */

export interface PricingRecommendation {
  bayId: number;
  offerId: number;
  currentPrice: number;
  recommendedPrice: number;
  change: number; // percentage
  reasoning: string[];
  confidence: number; // 0-1
  expectedImpact: {
    revenueChange: number; // dollars per week
    bookingChange: number; // percentage
  };
  validFrom: Date;
  validUntil: Date;
}

export interface DemandForecast {
  facilityId: number;
  timeSlot: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    hour: number; // 0-23
  };
  demandScore: number; // 0-100
  historicalUtilization: number; // 0-1
  projectedBookings: number;
  confidence: number;
}

export interface PricingStrategy {
  strategyType: 'peak_hours' | 'off_peak_discount' | 'event_surge' | 'early_bird' | 'last_minute';
  multiplier: number; // Applied to base price
  conditions: {
    dayOfWeek?: number[];
    hourRange?: { start: number; end: number };
    daysInAdvance?: { min: number; max: number };
    nearEvent?: boolean;
  };
  description: string;
}

class DynamicPricingAgent {
  private static instance: DynamicPricingAgent;
  private processingInterval: NodeJS.Timeout | null = null;
  private demandCache: Map<string, DemandForecast> = new Map();

  // Pricing strategy templates
  private strategies: PricingStrategy[] = [
    {
      strategyType: 'peak_hours',
      multiplier: 1.3,
      conditions: {
        dayOfWeek: [5, 6], // Friday, Saturday
        hourRange: { start: 17, end: 22 }
      },
      description: 'Weekend evening peak pricing'
    },
    {
      strategyType: 'off_peak_discount',
      multiplier: 0.75,
      conditions: {
        dayOfWeek: [1, 2], // Monday, Tuesday
        hourRange: { start: 10, end: 16 }
      },
      description: 'Weekday afternoon discount'
    },
    {
      strategyType: 'early_bird',
      multiplier: 0.85,
      conditions: {
        daysInAdvance: { min: 7, max: 30 }
      },
      description: 'Early booking discount'
    },
    {
      strategyType: 'last_minute',
      multiplier: 0.8,
      conditions: {
        daysInAdvance: { min: 0, max: 1 }
      },
      description: 'Last-minute fill discount'
    },
    {
      strategyType: 'event_surge',
      multiplier: 1.5,
      conditions: {
        nearEvent: true
      },
      description: 'Tournament/event surge pricing'
    }
  ];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): DynamicPricingAgent {
    if (!DynamicPricingAgent.instance) {
      DynamicPricingAgent.instance = new DynamicPricingAgent();
    }
    return DynamicPricingAgent.instance;
  }

  private async initialize() {
    console.log('💰 Dynamic Pricing Agent initializing...');

    // Run pricing analysis every 24 hours
    this.processingInterval = setInterval(() => {
      this.analyzePricingOpportunities();
    }, 24 * 60 * 60 * 1000);

    // Run initial analysis after 10 seconds
    setTimeout(() => this.analyzePricingOpportunities(), 10000);
  }

  /**
   * Forecast demand for a specific time slot
   */
  public async forecastDemand(
    facilityId: number,
    dayOfWeek: number,
    hour: number
  ): Promise<DemandForecast> {
    const cacheKey = `${facilityId}-${dayOfWeek}-${hour}`;
    const cached = this.demandCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Get historical bookings for this day/hour over past 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historicalBookings = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalBays: sql<number>`COUNT(DISTINCT ${bookings.bayId})`
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          gte(bookings.startTime, ninetyDaysAgo),
          sql`EXTRACT(DOW FROM ${bookings.startTime}) = ${dayOfWeek}`,
          sql`EXTRACT(HOUR FROM ${bookings.startTime}) = ${hour}`
        )
      );

    const totalBaysCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bays)
      .where(eq(bays.facilityId, facilityId));

    const weekCount = 13; // ~90 days / 7
    const avgBookingsPerWeek = historicalBookings[0]?.count ? historicalBookings[0].count / weekCount : 0;
    const totalBays = totalBaysCount[0]?.count || 1;
    const utilization = avgBookingsPerWeek / totalBays;

    // Calculate demand score (0-100)
    const demandScore = Math.min(100, utilization * 100);

    // Project future bookings based on trend
    const projectedBookings = Math.round(avgBookingsPerWeek * 1.1); // 10% growth assumption

    const forecast: DemandForecast = {
      facilityId,
      timeSlot: { dayOfWeek, hour },
      demandScore,
      historicalUtilization: utilization,
      projectedBookings,
      confidence: historicalBookings[0]?.count > 10 ? 0.8 : 0.5
    };

    this.demandCache.set(cacheKey, forecast);
    return forecast;
  }

  /**
   * Generate pricing recommendations for all bays
   */
  public async generatePricingRecommendations(facilityId: number): Promise<PricingRecommendation[]> {
    const recommendations: PricingRecommendation[] = [];

    // Get all bay rental offers
    const offers = await db
      .select()
      .from(bayRentalOffers)
      .where(eq(bayRentalOffers.facilityId, facilityId));

    for (const offer of offers) {
      // Analyze demand patterns for different time slots
      const timeSlots = this.generateTimeSlots();

      for (const slot of timeSlots) {
        const demand = await this.forecastDemand(facilityId, slot.dayOfWeek, slot.hour);

        // Skip if low confidence
        if (demand.confidence < 0.5) continue;

        const currentPrice = offer.price;
        const recommendation = this.calculateOptimalPrice(
          currentPrice,
          demand,
          slot,
          offer
        );

        if (recommendation && Math.abs(recommendation.change) > 5) {
          recommendations.push(recommendation);
        }
      }
    }

    // Sort by expected revenue impact
    return recommendations.sort((a, b) =>
      b.expectedImpact.revenueChange - a.expectedImpact.revenueChange
    );
  }

  /**
   * Calculate optimal price based on demand and strategies
   */
  private calculateOptimalPrice(
    basePrice: number,
    demand: DemandForecast,
    timeSlot: { dayOfWeek: number; hour: number },
    offer: any
  ): PricingRecommendation | null {
    let recommendedMultiplier = 1.0;
    const reasoning: string[] = [];
    let strategyApplied: PricingStrategy | null = null;

    // Apply strategies based on conditions
    for (const strategy of this.strategies) {
      if (this.strategyMatches(strategy, timeSlot, demand)) {
        recommendedMultiplier = strategy.multiplier;
        reasoning.push(strategy.description);
        strategyApplied = strategy;
        break;
      }
    }

    // Additional demand-based adjustment
    if (demand.demandScore > 80) {
      recommendedMultiplier *= 1.15;
      reasoning.push('High demand detected (>80% utilization)');
    } else if (demand.demandScore < 30) {
      recommendedMultiplier *= 0.9;
      reasoning.push('Low demand detected (<30% utilization)');
    }

    const recommendedPrice = Math.round(basePrice * recommendedMultiplier);
    const change = ((recommendedPrice - basePrice) / basePrice) * 100;

    // Don't recommend if change is too small
    if (Math.abs(change) < 5) return null;

    // Calculate expected impact
    const priceElasticity = -1.2; // -1.2% bookings per 1% price increase
    const bookingChange = change * priceElasticity;
    const currentRevenue = basePrice * demand.projectedBookings;
    const projectedBookings = demand.projectedBookings * (1 + bookingChange / 100);
    const projectedRevenue = recommendedPrice * projectedBookings;
    const revenueChange = projectedRevenue - currentRevenue;

    return {
      bayId: offer.bayId,
      offerId: offer.id,
      currentPrice: basePrice,
      recommendedPrice,
      change,
      reasoning,
      confidence: demand.confidence,
      expectedImpact: {
        revenueChange: Math.round(revenueChange),
        bookingChange: Math.round(bookingChange)
      },
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
    };
  }

  /**
   * Check if a pricing strategy matches the conditions
   */
  private strategyMatches(
    strategy: PricingStrategy,
    timeSlot: { dayOfWeek: number; hour: number },
    demand: DemandForecast
  ): boolean {
    const { conditions } = strategy;

    if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(timeSlot.dayOfWeek)) {
      return false;
    }

    if (conditions.hourRange) {
      const { start, end } = conditions.hourRange;
      if (timeSlot.hour < start || timeSlot.hour >= end) {
        return false;
      }
    }

    // Note: daysInAdvance and nearEvent would be evaluated at booking time
    // For forecast purposes, we use historical patterns

    return true;
  }

  /**
   * Generate all possible time slots (day/hour combinations)
   */
  private generateTimeSlots(): Array<{ dayOfWeek: number; hour: number }> {
    const slots: Array<{ dayOfWeek: number; hour: number }> = [];

    // Focus on operating hours (8 AM - 11 PM)
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday - Saturday

    for (const day of days) {
      for (const hour of hours) {
        slots.push({ dayOfWeek: day, hour });
      }
    }

    return slots;
  }

  /**
   * Calculate revenue impact of implementing recommendations
   */
  public async calculateRevenueImpact(
    recommendations: PricingRecommendation[]
  ): Promise<{
    totalCurrentRevenue: number;
    totalProjectedRevenue: number;
    totalIncrease: number;
    increasePercentage: number;
  }> {
    let totalCurrentRevenue = 0;
    let totalProjectedRevenue = 0;

    for (const rec of recommendations) {
      totalCurrentRevenue += rec.currentPrice * 4; // Assume 4 bookings per week
      totalProjectedRevenue += rec.expectedImpact.revenueChange + (rec.currentPrice * 4);
    }

    const totalIncrease = totalProjectedRevenue - totalCurrentRevenue;
    const increasePercentage = (totalIncrease / totalCurrentRevenue) * 100;

    return {
      totalCurrentRevenue,
      totalProjectedRevenue,
      totalIncrease,
      increasePercentage
    };
  }

  /**
   * Get real-time price for a booking attempt
   */
  public async getRealTimePrice(
    offerId: number,
    requestedTime: Date,
    daysInAdvance: number
  ): Promise<{ price: number; appliedStrategy: string | null }> {
    const [offer] = await db
      .select()
      .from(bayRentalOffers)
      .where(eq(bayRentalOffers.id, offerId));

    if (!offer) {
      throw new Error('Offer not found');
    }

    const dayOfWeek = requestedTime.getDay();
    const hour = requestedTime.getHours();

    let multiplier = 1.0;
    let appliedStrategy: string | null = null;

    // Check if near event
    const nearEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.facilityId, offer.facilityId),
          between(
            events.startTime,
            new Date(requestedTime.getTime() - 24 * 60 * 60 * 1000),
            new Date(requestedTime.getTime() + 24 * 60 * 60 * 1000)
          )
        )
      );

    // Apply strategies
    for (const strategy of this.strategies) {
      const { conditions } = strategy;

      let matches = true;

      if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(dayOfWeek)) {
        matches = false;
      }

      if (conditions.hourRange) {
        if (hour < conditions.hourRange.start || hour >= conditions.hourRange.end) {
          matches = false;
        }
      }

      if (conditions.daysInAdvance) {
        if (daysInAdvance < conditions.daysInAdvance.min || daysInAdvance > conditions.daysInAdvance.max) {
          matches = false;
        }
      }

      if (conditions.nearEvent && nearEvents.length === 0) {
        matches = false;
      }

      if (matches) {
        multiplier = strategy.multiplier;
        appliedStrategy = strategy.description;
        break;
      }
    }

    const finalPrice = Math.round(offer.price * multiplier);

    return {
      price: finalPrice,
      appliedStrategy
    };
  }

  /**
   * Process pricing opportunities for all facilities
   */
  private async analyzePricingOpportunities() {
    try {
      console.log('💰 Dynamic Pricing Agent: Analyzing pricing opportunities...');

      // Get all facilities with bay rental offers
      const facilities = await db
        .select({ id: sql<number>`DISTINCT ${bayRentalOffers.facilityId}` })
        .from(bayRentalOffers);

      for (const facility of facilities) {
        if (facility.id) {
          const recommendations = await this.generatePricingRecommendations(facility.id);
          const impact = await this.calculateRevenueImpact(recommendations);

          console.log(
            `💰 Facility ${facility.id}: ${recommendations.length} pricing opportunities, ` +
            `projected revenue increase: $${impact.totalIncrease.toFixed(2)} (${impact.increasePercentage.toFixed(1)}%)`
          );
        }
      }

      console.log('✅ Dynamic Pricing Agent: Analysis complete');
    } catch (error) {
      console.error('❌ Dynamic Pricing Agent: Error analyzing pricing:', error);
    }
  }

  public shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const dynamicPricingAgent = DynamicPricingAgent.getInstance();
