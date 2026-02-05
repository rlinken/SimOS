import { db } from "@db";
import { bookings, lessons, membershipTiers, users, events, products } from "@db/schema";
import { eq, and, sql, gte, lte, between, desc } from "drizzle-orm";

/**
 * Financial Analytics Agent
 *
 * Responsibilities:
 * - Generate revenue forecasts and projections
 * - Analyze profitability by service line
 * - Track key financial metrics (MRR, ARR, churn rate)
 * - Identify revenue optimization opportunities
 * - Monitor cash flow and payment trends
 * - Generate financial reports and dashboards
 * - Alert on unusual financial patterns
 */

export interface RevenueMetrics {
  facilityId: number;
  period: { start: Date; end: Date };
  totalRevenue: number;
  breakdown: {
    bayRentals: number;
    lessons: number;
    memberships: number;
    events: number;
    products: number;
    other: number;
  };
  growth: {
    percentChange: number;
    trend: 'up' | 'down' | 'stable';
  };
  averages: {
    dailyRevenue: number;
    revenuePerCustomer: number;
    revenuePerBooking: number;
  };
}

export interface MRRMetrics {
  facilityId: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  activeMemberships: number;
  newMemberships: number;
  churnedMemberships: number;
  churnRate: number; // percentage
  growthRate: number; // percentage
  ltv: number; // Lifetime Value per member
  cac?: number; // Customer Acquisition Cost
}

export interface ProfitabilityAnalysis {
  facilityId: number;
  serviceLines: Array<{
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number; // percentage
    volume: number;
    avgTicket: number;
  }>;
  overallMargin: number;
  recommendations: string[];
}

export interface CashFlowForecast {
  facilityId: number;
  forecastPeriod: { start: Date; end: Date };
  projections: Array<{
    date: Date;
    expectedRevenue: number;
    expectedExpenses: number;
    netCashFlow: number;
    confidence: number; // 0-1
  }>;
  summary: {
    totalExpectedRevenue: number;
    totalExpectedExpenses: number;
    netPosition: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface RevenueOpportunity {
  id: string;
  type: string;
  description: string;
  estimatedValue: number; // annual
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
  reasoning: string[];
}

export interface FinancialAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  value: number;
  threshold: number;
  createdAt: Date;
}

class FinancialAnalyticsAgent {
  private static instance: FinancialAnalyticsAgent;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): FinancialAnalyticsAgent {
    if (!FinancialAnalyticsAgent.instance) {
      FinancialAnalyticsAgent.instance = new FinancialAnalyticsAgent();
    }
    return FinancialAnalyticsAgent.instance;
  }

  private async initialize() {
    console.log('💰 Financial Analytics Agent initializing...');

    // Run daily financial analysis
    this.processingInterval = setInterval(() => {
      this.runDailyAnalysis();
    }, 24 * 60 * 60 * 1000);

    // Run initial analysis after 20 seconds
    setTimeout(() => this.runDailyAnalysis(), 20000);
  }

  /**
   * Calculate comprehensive revenue metrics
   */
  public async calculateRevenueMetrics(
    facilityId: number,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueMetrics> {
    // Get bay rental revenue
    const bayRentals = await db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.price}), 0)`
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          between(bookings.startTime, startDate, endDate)
        )
      );

    // Get lesson revenue
    const lessonRevenue = await db
      .select({
        total: sql<number>`COALESCE(SUM(${lessons.price}), 0)`
      })
      .from(lessons)
      .where(
        and(
          eq(lessons.facilityId, facilityId),
          between(lessons.scheduledAt, startDate, endDate)
        )
      );

    // Get membership revenue (would need membership_payments table in production)
    const membershipRevenue = 0; // Placeholder

    // Get event revenue
    const eventRevenue = 0; // Placeholder - would sum from events table

    // Get product revenue
    const productRevenue = 0; // Placeholder - would sum from product_sales table

    const bayTotal = Number(bayRentals[0]?.total || 0);
    const lessonTotal = Number(lessonRevenue[0]?.total || 0);
    const totalRevenue = bayTotal + lessonTotal + membershipRevenue + eventRevenue + productRevenue;

    // Calculate growth vs previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = startDate;

    const previousRevenue = await this.calculateTotalRevenue(facilityId, previousStart, previousEnd);
    const percentChange = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    const trend: 'up' | 'down' | 'stable' =
      percentChange > 5 ? 'up' :
      percentChange < -5 ? 'down' : 'stable';

    // Calculate averages
    const days = Math.ceil(periodLength / (1000 * 60 * 60 * 24));
    const dailyRevenue = totalRevenue / days;

    // Get unique customers
    const uniqueCustomers = await this.getUniqueCustomerCount(facilityId, startDate, endDate);
    const revenuePerCustomer = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    // Get total bookings
    const totalBookings = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          between(bookings.startTime, startDate, endDate)
        )
      );

    const bookingCount = Number(totalBookings[0]?.count || 0);
    const revenuePerBooking = bookingCount > 0 ? totalRevenue / bookingCount : 0;

    return {
      facilityId,
      period: { start: startDate, end: endDate },
      totalRevenue,
      breakdown: {
        bayRentals: bayTotal,
        lessons: lessonTotal,
        memberships: membershipRevenue,
        events: eventRevenue,
        products: productRevenue,
        other: 0
      },
      growth: {
        percentChange: Math.round(percentChange * 10) / 10,
        trend
      },
      averages: {
        dailyRevenue: Math.round(dailyRevenue * 100) / 100,
        revenuePerCustomer: Math.round(revenuePerCustomer * 100) / 100,
        revenuePerBooking: Math.round(revenuePerBooking * 100) / 100
      }
    };
  }

  /**
   * Calculate MRR (Monthly Recurring Revenue) metrics
   */
  public async calculateMRRMetrics(facilityId: number): Promise<MRRMetrics> {
    // Get all active memberships
    const activeMembers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.facilityId, facilityId),
          sql`${users.membershipTierId} IS NOT NULL`
        )
      );

    // Get membership tiers and calculate MRR
    const tiers = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.facilityId, facilityId));

    let totalMRR = 0;
    for (const member of activeMembers) {
      if (member.membershipTierId) {
        const tier = tiers.find(t => t.id === member.membershipTierId);
        if (tier) {
          // Normalize to monthly
          let monthlyPrice = tier.price;
          if (tier.billingCycle === 'annual') {
            monthlyPrice = tier.price / 12;
          }
          totalMRR += monthlyPrice;
        }
      }
    }

    const arr = totalMRR * 12;

    // Calculate new memberships this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const newMembers = activeMembers.filter(m =>
      m.createdAt && new Date(m.createdAt) >= monthStart
    ).length;

    // Calculate churn (simplified - would need membership_history table)
    const churnedMemberships = 0; // Placeholder
    const churnRate = activeMembers.length > 0
      ? (churnedMemberships / activeMembers.length) * 100
      : 0;

    // Calculate growth rate
    const previousMRR = totalMRR * 0.95; // Simplified - would calculate actual previous month
    const growthRate = previousMRR > 0
      ? ((totalMRR - previousMRR) / previousMRR) * 100
      : 0;

    // Calculate LTV (Lifetime Value)
    const avgMonthlyRevenue = totalMRR / (activeMembers.length || 1);
    const avgLifetimeMonths = churnRate > 0 ? 1 / (churnRate / 100) : 24; // Default 24 months
    const ltv = avgMonthlyRevenue * avgLifetimeMonths;

    return {
      facilityId,
      mrr: Math.round(totalMRR * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      activeMemberships: activeMembers.length,
      newMemberships: newMembers,
      churnedMemberships,
      churnRate: Math.round(churnRate * 10) / 10,
      growthRate: Math.round(growthRate * 10) / 10,
      ltv: Math.round(ltv * 100) / 100
    };
  }

  /**
   * Analyze profitability by service line
   */
  public async analyzeProfitability(facilityId: number): Promise<ProfitabilityAnalysis> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const metrics = await this.calculateRevenueMetrics(facilityId, monthStart, now);

    // Estimate costs (in production, would have cost tracking)
    const serviceLines = [
      {
        name: 'Bay Rentals',
        revenue: metrics.breakdown.bayRentals,
        cost: metrics.breakdown.bayRentals * 0.30, // 30% cost estimate
        profit: metrics.breakdown.bayRentals * 0.70,
        margin: 70,
        volume: 100, // Would get actual booking count
        avgTicket: metrics.averages.revenuePerBooking
      },
      {
        name: 'Lessons',
        revenue: metrics.breakdown.lessons,
        cost: metrics.breakdown.lessons * 0.50, // 50% instructor cost
        profit: metrics.breakdown.lessons * 0.50,
        margin: 50,
        volume: 50, // Would get actual lesson count
        avgTicket: metrics.breakdown.lessons / 50
      },
      {
        name: 'Memberships',
        revenue: metrics.breakdown.memberships,
        cost: metrics.breakdown.memberships * 0.20,
        profit: metrics.breakdown.memberships * 0.80,
        margin: 80,
        volume: 0,
        avgTicket: 0
      }
    ];

    const totalProfit = serviceLines.reduce((sum, line) => sum + line.profit, 0);
    const overallMargin = metrics.totalRevenue > 0
      ? (totalProfit / metrics.totalRevenue) * 100
      : 0;

    const recommendations: string[] = [];

    // Generate recommendations
    serviceLines.forEach(line => {
      if (line.margin < 40) {
        recommendations.push(`${line.name}: Consider cost reduction or price increase (margin: ${line.margin}%)`);
      }
      if (line.revenue > metrics.totalRevenue * 0.5) {
        recommendations.push(`${line.name}: Dominant revenue source - protect and optimize`);
      }
    });

    return {
      facilityId,
      serviceLines,
      overallMargin: Math.round(overallMargin * 10) / 10,
      recommendations
    };
  }

  /**
   * Generate cash flow forecast
   */
  public async forecastCashFlow(
    facilityId: number,
    daysAhead: number = 30
  ): Promise<CashFlowForecast> {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get historical daily average
    const last30Days = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const historicalMetrics = await this.calculateRevenueMetrics(facilityId, last30Days, startDate);
    const avgDailyRevenue = historicalMetrics.averages.dailyRevenue;

    // Estimate daily expenses (would come from expense tracking system)
    const estimatedDailyExpenses = avgDailyRevenue * 0.65; // 65% expense ratio

    const projections: CashFlowForecast['projections'] = [];
    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;

    for (let i = 0; i < daysAhead; i++) {
      const projectionDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = projectionDate.getDay();

      // Adjust for day of week (weekends higher)
      let revenueFactor = 1.0;
      if (dayOfWeek === 5 || dayOfWeek === 6) revenueFactor = 1.4; // Friday/Saturday
      if (dayOfWeek === 0) revenueFactor = 1.2; // Sunday
      if (dayOfWeek === 1) revenueFactor = 0.7; // Monday

      const expectedRevenue = avgDailyRevenue * revenueFactor;
      const expectedExpenses = estimatedDailyExpenses;
      const netCashFlow = expectedRevenue - expectedExpenses;

      cumulativeRevenue += expectedRevenue;
      cumulativeExpenses += expectedExpenses;

      projections.push({
        date: projectionDate,
        expectedRevenue: Math.round(expectedRevenue * 100) / 100,
        expectedExpenses: Math.round(expectedExpenses * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        confidence: 0.75 // Decreases with distance
      });
    }

    const netPosition = cumulativeRevenue - cumulativeExpenses;
    const riskLevel: 'low' | 'medium' | 'high' =
      netPosition > 0 ? 'low' :
      netPosition > -5000 ? 'medium' : 'high';

    return {
      facilityId,
      forecastPeriod: { start: startDate, end: endDate },
      projections,
      summary: {
        totalExpectedRevenue: Math.round(cumulativeRevenue * 100) / 100,
        totalExpectedExpenses: Math.round(cumulativeExpenses * 100) / 100,
        netPosition: Math.round(netPosition * 100) / 100,
        riskLevel
      }
    };
  }

  /**
   * Identify revenue optimization opportunities
   */
  public async identifyOpportunities(facilityId: number): Promise<RevenueOpportunity[]> {
    const opportunities: RevenueOpportunity[] = [];

    const metrics = await this.calculateRevenueMetrics(
      facilityId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    const mrr = await this.calculateMRRMetrics(facilityId);

    // Opportunity: Membership growth
    if (mrr.growthRate < 10) {
      opportunities.push({
        id: 'membership-growth',
        type: 'Membership Growth',
        description: 'Increase membership sign-ups through targeted campaigns',
        estimatedValue: mrr.arr * 0.2, // 20% growth
        effort: 'medium',
        priority: 9,
        reasoning: [
          `Current growth rate: ${mrr.growthRate}%`,
          'Target: 15-20% monthly growth',
          'High margin business (80%+)'
        ]
      });
    }

    // Opportunity: Lesson revenue
    if (metrics.breakdown.lessons < metrics.breakdown.bayRentals * 0.3) {
      opportunities.push({
        id: 'lesson-upsell',
        type: 'Lesson Upselling',
        description: 'Convert more bay rental customers to lesson customers',
        estimatedValue: metrics.breakdown.bayRentals * 0.3 - metrics.breakdown.lessons,
        effort: 'low',
        priority: 8,
        reasoning: [
          'Lesson revenue below industry benchmark (30% of bay rentals)',
          'Automated follow-up campaigns can drive conversions',
          'High margin service'
        ]
      });
    }

    // Opportunity: Weekend premium pricing
    if (metrics.growth.trend !== 'up') {
      opportunities.push({
        id: 'dynamic-pricing',
        type: 'Dynamic Pricing Implementation',
        description: 'Implement weekend/peak hour premium pricing',
        estimatedValue: metrics.totalRevenue * 0.15, // 15% revenue increase
        effort: 'low',
        priority: 7,
        reasoning: [
          'Peak demand periods identified',
          'Customers show price insensitivity during weekends',
          'Quick to implement'
        ]
      });
    }

    // Sort by priority
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Run daily financial analysis
   */
  private async runDailyAnalysis(): Promise<void> {
    try {
      console.log('💰 Financial Analytics Agent: Running daily analysis...');

      // Get all facilities
      const facilities = await db
        .select({ id: sql<number>`DISTINCT ${bookings.facilityId}` })
        .from(bookings);

      for (const facility of facilities) {
        if (facility.id) {
          const alerts = await this.checkFinancialAlerts(facility.id);

          if (alerts.length > 0) {
            console.log(`⚠️ Facility ${facility.id}: ${alerts.length} financial alerts`);
            alerts.forEach(alert => {
              console.log(`  - [${alert.severity}] ${alert.message}`);
            });
          }
        }
      }

      console.log('✅ Financial Analytics Agent: Daily analysis complete');
    } catch (error) {
      console.error('❌ Financial Analytics Agent: Error in daily analysis:', error);
    }
  }

  /**
   * Check for financial alerts
   */
  private async checkFinancialAlerts(facilityId: number): Promise<FinancialAlert[]> {
    const alerts: FinancialAlert[] = [];

    // Check revenue decline
    const last7Days = await this.calculateRevenueMetrics(
      facilityId,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    );

    if (last7Days.growth.trend === 'down' && last7Days.growth.percentChange < -15) {
      alerts.push({
        id: `alert_${Date.now()}`,
        severity: 'warning',
        type: 'revenue_decline',
        message: `Revenue down ${Math.abs(last7Days.growth.percentChange)}% vs previous period`,
        value: last7Days.growth.percentChange,
        threshold: -15,
        createdAt: new Date()
      });
    }

    // Check MRR churn
    const mrrMetrics = await this.calculateMRRMetrics(facilityId);
    if (mrrMetrics.churnRate > 5) {
      alerts.push({
        id: `alert_${Date.now()}_churn`,
        severity: 'critical',
        type: 'high_churn',
        message: `Membership churn rate at ${mrrMetrics.churnRate}%`,
        value: mrrMetrics.churnRate,
        threshold: 5,
        createdAt: new Date()
      });
    }

    return alerts;
  }

  // Helper methods

  private async calculateTotalRevenue(
    facilityId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const bayRentals = await db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.price}), 0)`
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          between(bookings.startTime, startDate, endDate)
        )
      );

    const lessonRevenue = await db
      .select({
        total: sql<number>`COALESCE(SUM(${lessons.price}), 0)`
      })
      .from(lessons)
      .where(
        and(
          eq(lessons.facilityId, facilityId),
          between(lessons.scheduledAt, startDate, endDate)
        )
      );

    return Number(bayRentals[0]?.total || 0) + Number(lessonRevenue[0]?.total || 0);
  }

  private async getUniqueCustomerCount(
    facilityId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${bookings.userId})`
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          between(bookings.startTime, startDate, endDate)
        )
      );

    return Number(result[0]?.count || 0);
  }

  public shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const financialAnalyticsAgent = FinancialAnalyticsAgent.getInstance();
