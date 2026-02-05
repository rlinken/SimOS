import { db } from "@db";
import { users, bookings, lessons, membershipTiers, membershipUsage } from "@db/schema";
import { eq, and, sql, lt, gte, desc } from "drizzle-orm";
import { marketingEngine } from "../marketing/marketing-engine";

/**
 * Customer Success Agent
 *
 * Responsibilities:
 * - Monitor customer engagement and identify at-risk customers
 * - Calculate customer health scores
 * - Trigger proactive outreach for churn prevention
 * - Identify upsell opportunities
 * - Track customer milestones and celebrate achievements
 * - Recommend personalized engagement strategies
 */

export interface CustomerHealthScore {
  userId: number;
  facilityId: number;
  overallScore: number; // 0-100
  engagementScore: number;
  satisfactionScore: number;
  usageScore: number;
  revenueScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    score: number;
    weight: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  recommendations: string[];
  lastCalculated: Date;
}

export interface ChurnRiskAlert {
  userId: number;
  facilityId: number;
  riskScore: number; // 0-100, higher = more risk
  reasons: string[];
  recommendedActions: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UpsellOpportunity {
  userId: number;
  facilityId: number;
  opportunityType: 'membership_upgrade' | 'lesson_package' | 'product' | 'event';
  confidence: number; // 0-1
  estimatedValue: number;
  reasoning: string[];
  recommendedOffer: string;
}

class CustomerSuccessAgent {
  private static instance: CustomerSuccessAgent;
  private healthScoreCache: Map<string, CustomerHealthScore> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): CustomerSuccessAgent {
    if (!CustomerSuccessAgent.instance) {
      CustomerSuccessAgent.instance = new CustomerSuccessAgent();
    }
    return CustomerSuccessAgent.instance;
  }

  private async initialize() {
    console.log('🎯 Customer Success Agent initializing...');

    // Run health score calculation every 6 hours
    this.processingInterval = setInterval(() => {
      this.processCustomerHealthScores();
    }, 6 * 60 * 60 * 1000);

    // Run initial calculation
    setTimeout(() => this.processCustomerHealthScores(), 5000);
  }

  /**
   * Calculate comprehensive health score for a customer
   */
  public async calculateHealthScore(userId: number, facilityId: number): Promise<CustomerHealthScore> {
    const cacheKey = `${facilityId}-${userId}`;
    const cached = this.healthScoreCache.get(cacheKey);

    // Return cached if less than 1 hour old
    if (cached && (Date.now() - cached.lastCalculated.getTime()) < 3600000) {
      return cached;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.facilityId, facilityId)));

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate engagement score (based on booking frequency)
    const recentBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.facilityId, facilityId),
          gte(bookings.startTime, thirtyDaysAgo)
        )
      );

    const historicalBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.facilityId, facilityId),
          gte(bookings.startTime, ninetyDaysAgo)
        )
      );

    const engagementScore = this.calculateEngagementScore(
      recentBookings.length,
      historicalBookings.length
    );

    // Calculate usage score (for members)
    let usageScore = 50; // Default for non-members
    if (user.membershipTierId) {
      const [usage] = await db
        .select()
        .from(membershipUsage)
        .where(
          and(
            eq(membershipUsage.userId, userId),
            eq(membershipUsage.facilityId, facilityId)
          )
        )
        .orderBy(desc(membershipUsage.periodStart))
        .limit(1);

      if (usage) {
        const [tier] = await db
          .select()
          .from(membershipTiers)
          .where(eq(membershipTiers.id, user.membershipTierId));

        if (tier && tier.includedHours) {
          const utilizationRate = usage.hoursUsed / tier.includedHours;
          usageScore = Math.min(100, utilizationRate * 100);
        }
      }
    }

    // Calculate revenue score (total spend)
    const recentLessons = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.customerId, userId),
          eq(lessons.facilityId, facilityId),
          gte(lessons.scheduledAt, thirtyDaysAgo)
        )
      );

    const totalRevenue = recentBookings.reduce((sum, b) => sum + (b.price || 0), 0) +
                        recentLessons.reduce((sum, l) => sum + (l.price || 0), 0);

    const revenueScore = Math.min(100, (totalRevenue / 500) * 100); // $500 = 100 score

    // Calculate satisfaction score (based on engagement trends)
    const satisfactionScore = this.calculateSatisfactionScore(user, recentBookings.length);

    // Calculate overall score (weighted average)
    const weights = {
      engagement: 0.35,
      usage: 0.25,
      revenue: 0.25,
      satisfaction: 0.15
    };

    const overallScore =
      engagementScore * weights.engagement +
      usageScore * weights.usage +
      revenueScore * weights.revenue +
      satisfactionScore * weights.satisfaction;

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore, engagementScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallScore,
      engagementScore,
      usageScore,
      revenueScore,
      user
    );

    const healthScore: CustomerHealthScore = {
      userId,
      facilityId,
      overallScore: Math.round(overallScore),
      engagementScore: Math.round(engagementScore),
      satisfactionScore: Math.round(satisfactionScore),
      usageScore: Math.round(usageScore),
      revenueScore: Math.round(revenueScore),
      riskLevel,
      factors: [
        {
          name: 'Engagement',
          score: Math.round(engagementScore),
          weight: weights.engagement,
          trend: this.determineTrend(engagementScore, 70)
        },
        {
          name: 'Usage',
          score: Math.round(usageScore),
          weight: weights.usage,
          trend: this.determineTrend(usageScore, 60)
        },
        {
          name: 'Revenue',
          score: Math.round(revenueScore),
          weight: weights.revenue,
          trend: this.determineTrend(revenueScore, 50)
        },
        {
          name: 'Satisfaction',
          score: Math.round(satisfactionScore),
          weight: weights.satisfaction,
          trend: this.determineTrend(satisfactionScore, 70)
        }
      ],
      recommendations,
      lastCalculated: now
    };

    this.healthScoreCache.set(cacheKey, healthScore);
    return healthScore;
  }

  /**
   * Identify customers at risk of churning
   */
  public async identifyChurnRisks(facilityId: number): Promise<ChurnRiskAlert[]> {
    const alerts: ChurnRiskAlert[] = [];

    // Get all active members
    const activeMembers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.facilityId, facilityId),
          sql`${users.membershipTierId} IS NOT NULL`
        )
      );

    for (const member of activeMembers) {
      const healthScore = await this.calculateHealthScore(member.id, facilityId);

      if (healthScore.riskLevel === 'high' || healthScore.riskLevel === 'critical') {
        const alert: ChurnRiskAlert = {
          userId: member.id,
          facilityId,
          riskScore: 100 - healthScore.overallScore,
          reasons: this.identifyChurnReasons(healthScore),
          recommendedActions: this.getChurnPreventionActions(healthScore),
          priority: healthScore.riskLevel === 'critical' ? 'urgent' : 'high'
        };

        alerts.push(alert);

        // Trigger marketing event for at-risk customer
        await marketingEngine.emitEvent({
          eventType: 'inactivity_detected',
          facilityId,
          userId: member.id,
          eventData: {
            daysSinceLastVisit: 30,
            totalBookings: healthScore.engagementScore,
            riskLevel: healthScore.riskLevel
          },
          timestamp: new Date()
        });
      }
    }

    return alerts;
  }

  /**
   * Identify upsell opportunities
   */
  public async identifyUpsellOpportunities(facilityId: number): Promise<UpsellOpportunity[]> {
    const opportunities: UpsellOpportunity[] = [];

    const activeCustomers = await db
      .select()
      .from(users)
      .where(eq(users.facilityId, facilityId))
      .limit(100);

    for (const customer of activeCustomers) {
      const healthScore = await this.calculateHealthScore(customer.id, facilityId);

      // High engagement, not a member = membership opportunity
      if (!customer.membershipTierId && healthScore.engagementScore > 70) {
        opportunities.push({
          userId: customer.id,
          facilityId,
          opportunityType: 'membership_upgrade',
          confidence: healthScore.engagementScore / 100,
          estimatedValue: 200, // Example value
          reasoning: [
            'High booking frequency',
            'Not currently a member',
            'Good engagement pattern'
          ],
          recommendedOffer: 'Introduce monthly membership with included hours'
        });
      }

      // Member with high usage = upgrade opportunity
      if (customer.membershipTierId && healthScore.usageScore > 85) {
        opportunities.push({
          userId: customer.id,
          facilityId,
          opportunityType: 'membership_upgrade',
          confidence: 0.8,
          estimatedValue: 100,
          reasoning: [
            'Using most of membership hours',
            'Consistent engagement',
            'Ready for higher tier'
          ],
          recommendedOffer: 'Upgrade to higher membership tier'
        });
      }

      // Good engagement but no lessons = lesson package opportunity
      if (healthScore.engagementScore > 60) {
        const recentLessons = await db
          .select()
          .from(lessons)
          .where(
            and(
              eq(lessons.customerId, customer.id),
              eq(lessons.facilityId, facilityId)
            )
          )
          .limit(1);

        if (recentLessons.length === 0) {
          opportunities.push({
            userId: customer.id,
            facilityId,
            opportunityType: 'lesson_package',
            confidence: 0.6,
            estimatedValue: 300,
            reasoning: [
              'Active player',
              'No recent lessons',
              'Could benefit from coaching'
            ],
            recommendedOffer: 'Starter lesson package (3 sessions)'
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Process customer health scores for all facilities
   */
  private async processCustomerHealthScores() {
    try {
      console.log('🎯 Customer Success Agent: Processing health scores...');

      // Get all facilities
      const facilities = await db.select({ id: sql<number>`DISTINCT ${users.facilityId}` }).from(users);

      for (const facility of facilities) {
        if (facility.id) {
          await this.identifyChurnRisks(facility.id);
          await this.identifyUpsellOpportunities(facility.id);
        }
      }

      console.log('✅ Customer Success Agent: Health score processing complete');
    } catch (error) {
      console.error('❌ Customer Success Agent: Error processing health scores:', error);
    }
  }

  // Helper methods
  private calculateEngagementScore(recent: number, historical: number): number {
    // Recent bookings (30 days) vs historical (90 days)
    const recentRate = recent / 30;
    const historicalRate = historical / 90;

    // If recent rate is higher, that's good engagement
    const engagementFactor = historical > 0 ? (recentRate / historicalRate) : 1;

    // Base score on absolute recent bookings
    let score = Math.min(100, recent * 10); // 10 bookings = 100

    // Adjust by trend
    if (engagementFactor > 1.2) score = Math.min(100, score * 1.2); // Improving
    else if (engagementFactor < 0.8) score = Math.max(0, score * 0.8); // Declining

    return score;
  }

  private calculateSatisfactionScore(user: any, recentBookings: number): number {
    // This is a simplified model - in production you'd use actual feedback
    let score = 70; // Base satisfaction

    if (recentBookings > 5) score += 15;
    if (user.membershipTierId) score += 10;
    if (recentBookings === 0) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  private determineRiskLevel(overallScore: number, engagementScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (overallScore >= 70 && engagementScore >= 60) return 'low';
    if (overallScore >= 50 && engagementScore >= 40) return 'medium';
    if (overallScore >= 30) return 'high';
    return 'critical';
  }

  private determineTrend(score: number, threshold: number): 'improving' | 'stable' | 'declining' {
    if (score > threshold + 10) return 'improving';
    if (score < threshold - 10) return 'declining';
    return 'stable';
  }

  private generateRecommendations(
    overall: number,
    engagement: number,
    usage: number,
    revenue: number,
    user: any
  ): string[] {
    const recommendations: string[] = [];

    if (engagement < 40) {
      recommendations.push('Send re-engagement campaign with special offer');
      recommendations.push('Personal outreach from staff to check in');
    }

    if (usage > 80 && user.membershipTierId) {
      recommendations.push('Offer membership tier upgrade');
    }

    if (revenue < 30 && engagement > 60) {
      recommendations.push('Introduce lesson packages or products');
    }

    if (overall < 50) {
      recommendations.push('Priority: High-touch customer success intervention needed');
    }

    return recommendations;
  }

  private identifyChurnReasons(healthScore: CustomerHealthScore): string[] {
    const reasons: string[] = [];

    if (healthScore.engagementScore < 40) {
      reasons.push('Low booking frequency');
    }
    if (healthScore.usageScore < 40) {
      reasons.push('Underutilizing membership benefits');
    }
    if (healthScore.satisfactionScore < 50) {
      reasons.push('Possible satisfaction issues');
    }

    return reasons;
  }

  private getChurnPreventionActions(healthScore: CustomerHealthScore): string[] {
    const actions: string[] = [];

    actions.push('Schedule personal call from facility manager');
    actions.push('Send "We miss you" campaign with discount');

    if (healthScore.usageScore < 40) {
      actions.push('Remind about unused membership hours');
    }

    if (healthScore.engagementScore < 30) {
      actions.push('Offer complimentary lesson or bay time');
    }

    return actions;
  }

  public shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const customerSuccessAgent = CustomerSuccessAgent.getInstance();
