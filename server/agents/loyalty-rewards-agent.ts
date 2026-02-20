import { db } from "@db";
import { users, bookings, lessons, events } from "@db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { marketingEngine } from "../marketing/marketing-engine";

/**
 * Loyalty & Rewards Agent
 *
 * Responsibilities:
 * - Track customer engagement and reward points
 * - Implement gamification elements (badges, achievements, levels)
 * - Calculate and award loyalty points for activities
 * - Manage rewards redemption and catalog
 * - Identify and celebrate customer milestones
 * - Drive engagement through challenges and leaderboards
 * - Personalize rewards based on behavior patterns
 */

export interface LoyaltyProfile {
  userId: number;
  facilityId: number;
  points: number;
  level: number;
  levelName: string;
  nextLevelThreshold: number;
  lifetimePoints: number;
  badges: Badge[];
  achievements: Achievement[];
  streak: {
    current: number; // Days
    longest: number;
    lastActivity: Date;
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number; // 0-100
  completed: boolean;
  completedDate?: Date;
  reward: {
    points: number;
    badge?: Badge;
  };
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointCost: number;
  type: 'discount' | 'free_bay_hour' | 'free_lesson' | 'merchandise' | 'upgrade';
  value: number;
  available: boolean;
  expiresAt?: Date;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  goal: {
    metric: 'bookings' | 'lessons' | 'events' | 'referrals' | 'practice_time';
    target: number;
  };
  reward: {
    points: number;
    badge?: Badge;
  };
  startDate: Date;
  endDate: Date;
  participants: number;
}

export interface Leaderboard {
  facilityId: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  category: 'points' | 'bookings' | 'improvement' | 'streak';
  rankings: Array<{
    rank: number;
    userId: number;
    username: string;
    score: number;
    trend: 'up' | 'down' | 'same';
  }>;
  lastUpdated: Date;
}

class LoyaltyRewardsAgent {
  private static instance: LoyaltyRewardsAgent;
  private pointsConfig = {
    booking: 10,
    lesson: 25,
    event_participation: 50,
    referral: 100,
    review: 15,
    streak_bonus: 5,
    milestone_multiplier: 2
  };

  private levels = [
    { level: 1, name: 'Beginner', threshold: 0 },
    { level: 2, name: 'Enthusiast', threshold: 100 },
    { level: 3, name: 'Regular', threshold: 250 },
    { level: 4, name: 'Dedicated', threshold: 500 },
    { level: 5, name: 'Expert', threshold: 1000 },
    { level: 6, name: 'Master', threshold: 2500 },
    { level: 7, name: 'Legend', threshold: 5000 }
  ];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): LoyaltyRewardsAgent {
    if (!LoyaltyRewardsAgent.instance) {
      LoyaltyRewardsAgent.instance = new LoyaltyRewardsAgent();
    }
    return LoyaltyRewardsAgent.instance;
  }

  private async initialize() {
    console.log('🎁 Loyalty & Rewards Agent initializing...');
  }

  /**
   * Get or create loyalty profile for a user
   */
  public async getLoyaltyProfile(userId: number, facilityId: number): Promise<LoyaltyProfile> {
    // In production, this would read from a loyalty_profiles table
    // For now, calculate from activity

    const points = await this.calculateTotalPoints(userId, facilityId);
    const lifetimePoints = points; // Would track separately
    const level = this.calculateLevel(points);
    const badges = await this.getUserBadges(userId, facilityId);
    const achievements = await this.getUserAchievements(userId, facilityId);
    const streak = await this.calculateStreak(userId, facilityId);

    const currentLevel = this.levels[level - 1];
    const nextLevel = this.levels[level] || this.levels[this.levels.length - 1];

    return {
      userId,
      facilityId,
      points,
      level,
      levelName: currentLevel.name,
      nextLevelThreshold: nextLevel.threshold,
      lifetimePoints,
      badges,
      achievements,
      streak
    };
  }

  /**
   * Award points for an activity
   */
  public async awardPoints(
    userId: number,
    facilityId: number,
    activity: 'booking' | 'lesson' | 'event_participation' | 'referral' | 'review',
    multiplier: number = 1
  ): Promise<{ pointsAwarded: number; newTotal: number; levelUp: boolean }> {
    const basePoints = this.pointsConfig[activity] || 0;
    const pointsAwarded = Math.round(basePoints * multiplier);

    // Get current profile
    const profile = await this.getLoyaltyProfile(userId, facilityId);
    const oldLevel = profile.level;

    // Calculate new totals (in production, update database)
    const newTotal = profile.points + pointsAwarded;
    const newLevel = this.calculateLevel(newTotal);
    const levelUp = newLevel > oldLevel;

    // Check for new achievements
    await this.checkAchievements(userId, facilityId);

    // Send notification if level up
    if (levelUp) {
      await marketingEngine.emitEvent({
        eventType: 'milestone_achieved',
        facilityId,
        userId,
        eventData: {
          milestoneType: 'level_up',
          newLevel: this.levels[newLevel - 1].name,
          points: newTotal
        },
        timestamp: new Date()
      });
    }

    return {
      pointsAwarded,
      newTotal,
      levelUp
    };
  }

  /**
   * Get available rewards catalog
   */
  public async getRewardsCatalog(facilityId: number, userLevel: number): Promise<Reward[]> {
    const rewards: Reward[] = [
      {
        id: 'discount-10',
        name: '10% Off Next Booking',
        description: 'Get 10% off your next bay rental',
        pointCost: 50,
        type: 'discount',
        value: 10,
        available: userLevel >= 1
      },
      {
        id: 'free-hour',
        name: 'Free Bay Hour',
        description: 'Complimentary 1-hour bay rental',
        pointCost: 150,
        type: 'free_bay_hour',
        value: 1,
        available: userLevel >= 2
      },
      {
        id: 'free-lesson',
        name: 'Free 30-Minute Lesson',
        description: 'Complimentary lesson with an instructor',
        pointCost: 300,
        type: 'free_lesson',
        value: 30,
        available: userLevel >= 3
      },
      {
        id: 'merch-25',
        name: '$25 Merchandise Credit',
        description: 'Credit toward pro shop merchandise',
        pointCost: 200,
        type: 'merchandise',
        value: 25,
        available: userLevel >= 2
      },
      {
        id: 'vip-upgrade',
        name: 'VIP Bay Upgrade',
        description: 'Upgrade to VIP bay for your next booking',
        pointCost: 100,
        type: 'upgrade',
        value: 1,
        available: userLevel >= 3
      },
      {
        id: 'discount-25',
        name: '25% Off Next Booking',
        description: 'Get 25% off your next bay rental',
        pointCost: 120,
        type: 'discount',
        value: 25,
        available: userLevel >= 4
      }
    ];

    return rewards.filter(r => r.available);
  }

  /**
   * Redeem a reward
   */
  public async redeemReward(
    userId: number,
    facilityId: number,
    rewardId: string
  ): Promise<{ success: boolean; message: string; code?: string }> {
    const profile = await this.getLoyaltyProfile(userId, facilityId);
    const rewards = await this.getRewardsCatalog(facilityId, profile.level);
    const reward = rewards.find(r => r.id === rewardId);

    if (!reward) {
      return { success: false, message: 'Reward not found or not available' };
    }

    if (profile.points < reward.pointCost) {
      return {
        success: false,
        message: `Insufficient points. Need ${reward.pointCost}, have ${profile.points}`
      };
    }

    // Deduct points and generate redemption code
    const code = this.generateRedemptionCode();

    // In production, would update database and create redemption record

    return {
      success: true,
      message: `${reward.name} redeemed successfully!`,
      code
    };
  }

  /**
   * Get active challenges
   */
  public async getActiveChallenges(facilityId: number): Promise<Challenge[]> {
    const now = new Date();

    const challenges: Challenge[] = [
      {
        id: 'daily-booking',
        name: 'Daily Player',
        description: 'Book a bay today',
        type: 'daily',
        goal: { metric: 'bookings', target: 1 },
        reward: { points: 10 },
        startDate: new Date(now.setHours(0, 0, 0, 0)),
        endDate: new Date(now.setHours(23, 59, 59, 999)),
        participants: 42
      },
      {
        id: 'weekly-practice',
        name: 'Weekly Warrior',
        description: 'Book 5 sessions this week',
        type: 'weekly',
        goal: { metric: 'bookings', target: 5 },
        reward: { points: 75 },
        startDate: this.getWeekStart(),
        endDate: this.getWeekEnd(),
        participants: 28
      },
      {
        id: 'monthly-improvement',
        name: 'Improvement Month',
        description: 'Take 4 lessons this month',
        type: 'monthly',
        goal: { metric: 'lessons', target: 4 },
        reward: {
          points: 200,
          badge: {
            id: 'dedicated-learner',
            name: 'Dedicated Learner',
            description: 'Completed monthly lesson challenge',
            icon: '🎓',
            earnedDate: new Date(),
            rarity: 'rare'
          }
        },
        startDate: this.getMonthStart(),
        endDate: this.getMonthEnd(),
        participants: 15
      },
      {
        id: 'referral-champion',
        name: 'Referral Champion',
        description: 'Refer 3 new members',
        type: 'special',
        goal: { metric: 'referrals', target: 3 },
        reward: {
          points: 300,
          badge: {
            id: 'ambassador',
            name: 'Ambassador',
            description: 'Brought friends to the game',
            icon: '🤝',
            earnedDate: new Date(),
            rarity: 'epic'
          }
        },
        startDate: this.getMonthStart(),
        endDate: this.getMonthEnd(),
        participants: 8
      }
    ];

    return challenges;
  }

  /**
   * Get leaderboard
   */
  public async getLeaderboard(
    facilityId: number,
    period: Leaderboard['period'],
    category: Leaderboard['category']
  ): Promise<Leaderboard> {
    // In production, would query actual data
    // For now, return mock data

    const rankings = [
      { rank: 1, userId: 101, username: 'GolfPro42', score: 2850, trend: 'up' as const },
      { rank: 2, userId: 102, username: 'SwingKing', score: 2640, trend: 'same' as const },
      { rank: 3, userId: 103, username: 'BirdieQueen', score: 2420, trend: 'up' as const },
      { rank: 4, userId: 104, username: 'ChipMaster', score: 2180, trend: 'down' as const },
      { rank: 5, userId: 105, username: 'PuttPutt', score: 1995, trend: 'up' as const }
    ];

    return {
      facilityId,
      period,
      category,
      rankings,
      lastUpdated: new Date()
    };
  }

  /**
   * Check and award achievements
   */
  private async checkAchievements(userId: number, facilityId: number): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    // Check booking milestone
    const bookingCount = await this.getBookingCount(userId, facilityId);

    if (bookingCount === 1) {
      newAchievements.push({
        id: 'first-booking',
        name: 'First Steps',
        description: 'Completed your first booking',
        progress: 100,
        completed: true,
        completedDate: new Date(),
        reward: {
          points: 25,
          badge: {
            id: 'first-timer',
            name: 'First Timer',
            description: 'Made your first booking',
            icon: '🎯',
            earnedDate: new Date(),
            rarity: 'common'
          }
        }
      });
    }

    if (bookingCount === 10) {
      newAchievements.push({
        id: 'ten-bookings',
        name: 'Regular Visitor',
        description: 'Completed 10 bookings',
        progress: 100,
        completed: true,
        completedDate: new Date(),
        reward: {
          points: 50,
          badge: {
            id: 'regular',
            name: 'Regular',
            description: '10 visits completed',
            icon: '⭐',
            earnedDate: new Date(),
            rarity: 'common'
          }
        }
      });
    }

    return newAchievements;
  }

  // Helper methods

  private async calculateTotalPoints(userId: number, facilityId: number): Promise<number> {
    const bookingCount = await this.getBookingCount(userId, facilityId);
    const lessonCount = await this.getLessonCount(userId, facilityId);

    return (
      bookingCount * this.pointsConfig.booking +
      lessonCount * this.pointsConfig.lesson
    );
  }

  private calculateLevel(points: number): number {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (points >= this.levels[i].threshold) {
        return this.levels[i].level;
      }
    }
    return 1;
  }

  private async getUserBadges(userId: number, facilityId: number): Promise<Badge[]> {
    // Would query badges table
    return [];
  }

  private async getUserAchievements(userId: number, facilityId: number): Promise<Achievement[]> {
    // Would query achievements table
    return [];
  }

  private async calculateStreak(userId: number, facilityId: number): Promise<LoyaltyProfile['streak']> {
    // Simplified streak calculation
    return {
      current: 3,
      longest: 7,
      lastActivity: new Date()
    };
  }

  private async getBookingCount(userId: number, facilityId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(and(eq(bookings.userId, userId), eq(bookings.facilityId, facilityId)));

    return result[0]?.count || 0;
  }

  private async getLessonCount(userId: number, facilityId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(lessons)
      .where(and(eq(lessons.customerId, userId), eq(lessons.facilityId, facilityId)));

    return result[0]?.count || 0;
  }

  private generateRedemptionCode(): string {
    return `RWD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.setDate(diff));
  }

  private getWeekEnd(): Date {
    const start = this.getWeekStart();
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private getMonthEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
}

export const loyaltyRewardsAgent = LoyaltyRewardsAgent.getInstance();
