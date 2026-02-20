import { db } from "@db";
import { users, bookings, lessons, events } from "@db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { marketingEngine } from "../marketing/marketing-engine";

/**
 * Review & Reputation Agent
 *
 * Responsibilities:
 * - Automate review request timing and delivery
 * - Monitor and respond to online reviews
 * - Calculate facility and instructor reputation scores
 * - Identify satisfaction issues and escalate concerns
 * - Generate reputation analytics and insights
 * - Manage review responses and thank customers
 * - Track Net Promoter Score (NPS) and sentiment
 */

export interface ReviewRequest {
  id: string;
  userId: number;
  facilityId: number;
  type: 'facility' | 'instructor' | 'event';
  relatedId: number; // Booking ID, Lesson ID, or Event ID
  platform: 'google' | 'facebook' | 'yelp' | 'internal';
  sentAt: Date;
  respondedAt?: Date;
  rating?: number;
  status: 'pending' | 'completed' | 'declined' | 'expired';
}

export interface Review {
  id: string;
  userId: number;
  facilityId: number;
  instructorId?: number;
  rating: number; // 1-5
  comment: string;
  platform: 'google' | 'facebook' | 'yelp' | 'internal';
  createdAt: Date;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  responded: boolean;
  responseText?: string;
  isPublic: boolean;
}

export interface ReputationScore {
  facilityId: number;
  instructorId?: number;
  overallRating: number; // 1-5
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  nps: number; // Net Promoter Score (-100 to 100)
  sentiment: {
    positive: number; // percentage
    neutral: number;
    negative: number;
  };
  trends: {
    ratingChange: number; // vs previous period
    reviewVolume: number; // vs previous period
    trending: 'up' | 'down' | 'stable';
  };
  topTopics: Array<{
    topic: string;
    mentions: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
}

export interface NPSResponse {
  userId: number;
  facilityId: number;
  score: number; // 0-10
  category: 'promoter' | 'passive' | 'detractor';
  comment?: string;
  createdAt: Date;
}

class ReviewReputationAgent {
  private static instance: ReviewReputationAgent;
  private processingInterval: NodeJS.Timeout | null = null;

  // Optimal timing for review requests (hours after service)
  private reviewTiming = {
    booking: 2, // 2 hours after bay rental
    lesson: 1, // 1 hour after lesson
    event: 4 // 4 hours after event
  };

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ReviewReputationAgent {
    if (!ReviewReputationAgent.instance) {
      ReviewReputationAgent.instance = new ReviewReputationAgent();
    }
    return ReviewReputationAgent.instance;
  }

  private async initialize() {
    console.log('⭐ Review & Reputation Agent initializing...');

    // Check for review opportunities every hour
    this.processingInterval = setInterval(() => {
      this.processReviewOpportunities();
    }, 60 * 60 * 1000);

    // Run initial check after 15 seconds
    setTimeout(() => this.processReviewOpportunities(), 15000);
  }

  /**
   * Identify and send review requests
   */
  public async processReviewOpportunities(): Promise<void> {
    try {
      console.log('⭐ Review & Reputation Agent: Processing review opportunities...');

      const now = new Date();

      // Find recent bookings ready for review
      const bookingOpportunities = await db
        .select()
        .from(bookings)
        .where(
          and(
            sql`${bookings.endTime} <= ${now}`,
            sql`${bookings.endTime} >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}` // Last 24 hours
          )
        )
        .limit(50);

      for (const booking of bookingOpportunities) {
        const timeSinceEnd = (now.getTime() - new Date(booking.endTime).getTime()) / (1000 * 60 * 60);

        if (timeSinceEnd >= this.reviewTiming.booking && timeSinceEnd < 24) {
          await this.sendReviewRequest(booking.userId, booking.facilityId, 'facility', booking.id);
        }
      }

      // Find recent lessons ready for review
      const lessonOpportunities = await db
        .select()
        .from(lessons)
        .where(
          and(
            sql`${lessons.scheduledAt} <= ${now}`,
            sql`${lessons.scheduledAt} >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`
          )
        )
        .limit(50);

      for (const lesson of lessonOpportunities) {
        const timeSinceEnd = (now.getTime() - new Date(lesson.scheduledAt).getTime()) / (1000 * 60 * 60);

        if (timeSinceEnd >= this.reviewTiming.lesson && timeSinceEnd < 24 && lesson.instructorId) {
          await this.sendReviewRequest(lesson.customerId, lesson.facilityId, 'instructor', lesson.id);
        }
      }

      console.log('✅ Review & Reputation Agent: Processing complete');
    } catch (error) {
      console.error('❌ Review & Reputation Agent: Error processing opportunities:', error);
    }
  }

  /**
   * Send a review request
   */
  public async sendReviewRequest(
    userId: number,
    facilityId: number,
    type: ReviewRequest['type'],
    relatedId: number,
    platform: ReviewRequest['platform'] = 'internal'
  ): Promise<ReviewRequest> {
    const request: ReviewRequest = {
      id: `req_${Date.now()}_${userId}`,
      userId,
      facilityId,
      type,
      relatedId,
      platform,
      sentAt: new Date(),
      status: 'pending'
    };

    // Send via marketing engine
    await marketingEngine.emitEvent({
      eventType: 'booking_created',
      facilityId,
      userId,
      eventData: {
        bookingId: relatedId,
        requestReview: true
      },
      timestamp: new Date()
    });

    console.log(`⭐ Sent ${type} review request to user ${userId} on ${platform}`);

    return request;
  }

  /**
   * Calculate reputation score
   */
  public async calculateReputationScore(
    facilityId: number,
    instructorId?: number
  ): Promise<ReputationScore> {
    // In production, would query actual reviews table
    // For now, return calculated mock data

    const reviews = await this.getReviews(facilityId, instructorId);

    const distribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    // Calculate NPS (assuming we have NPS data)
    const nps = await this.calculateNPS(facilityId);

    // Calculate sentiment distribution
    const sentiment = {
      positive: (reviews.filter(r => r.sentiment === 'positive').length / totalReviews) * 100,
      neutral: (reviews.filter(r => r.sentiment === 'neutral').length / totalReviews) * 100,
      negative: (reviews.filter(r => r.sentiment === 'negative').length / totalReviews) * 100
    };

    // Extract topics
    const topicCounts = new Map<string, { mentions: number; sentiment: 'positive' | 'neutral' | 'negative' }>();
    reviews.forEach(review => {
      review.topics.forEach(topic => {
        const existing = topicCounts.get(topic) || { mentions: 0, sentiment: review.sentiment };
        existing.mentions++;
        topicCounts.set(topic, existing);
      });
    });

    const topTopics = Array.from(topicCounts.entries())
      .map(([topic, data]) => ({ topic, ...data }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);

    return {
      facilityId,
      instructorId,
      overallRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      distribution,
      nps,
      sentiment,
      trends: {
        ratingChange: 0.2, // +0.2 vs last period
        reviewVolume: 15, // +15% vs last period
        trending: 'up'
      },
      topTopics
    };
  }

  /**
   * Calculate Net Promoter Score
   */
  private async calculateNPS(facilityId: number): Promise<number> {
    // Would query NPS responses from database
    // For now, return a good score
    const responses: NPSResponse[] = [];

    const promoters = responses.filter(r => r.category === 'promoter').length;
    const detractors = responses.filter(r => r.category === 'detractor').length;
    const total = responses.length;

    if (total === 0) return 0;

    return Math.round(((promoters - detractors) / total) * 100);
  }

  /**
   * Analyze review sentiment and extract topics
   */
  public analyzereview(text: string, rating: number): {
    sentiment: Review['sentiment'];
    topics: string[];
  } {
    // Simplified sentiment analysis based on rating
    let sentiment: Review['sentiment'];

    if (rating >= 4) sentiment = 'positive';
    else if (rating >= 3) sentiment = 'neutral';
    else sentiment = 'negative';

    // Extract topics (in production, would use NLP)
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('staff') || lowerText.includes('service')) topics.push('staff');
    if (lowerText.includes('clean') || lowerText.includes('facility')) topics.push('cleanliness');
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('value')) topics.push('pricing');
    if (lowerText.includes('equipment') || lowerText.includes('simulator')) topics.push('equipment');
    if (lowerText.includes('instructor') || lowerText.includes('lesson')) topics.push('instruction');
    if (lowerText.includes('food') || lowerText.includes('drink') || lowerText.includes('beverage')) topics.push('food_beverage');

    return { sentiment, topics };
  }

  /**
   * Generate suggested response to a review
   */
  public generateReviewResponse(review: Review): string {
    const templates = {
      positive: [
        `Thank you so much for your ${review.rating}-star review! We're thrilled you enjoyed your experience with us. We look forward to seeing you again soon!`,
        `We appreciate your kind words! It's wonderful to hear you had such a positive experience. Thank you for choosing us!`,
        `Thank you for taking the time to share your experience! We're so glad you enjoyed your visit and hope to see you back soon.`
      ],
      neutral: [
        `Thank you for your feedback. We appreciate you taking the time to share your experience. If there's anything we can do to improve, please don't hesitate to reach out.`,
        `We appreciate your review and are always working to improve. Thank you for giving us the opportunity to serve you.`
      ],
      negative: [
        `We sincerely apologize that we didn't meet your expectations. Your feedback is important to us, and we'd like the opportunity to make this right. Please contact us directly so we can address your concerns.`,
        `Thank you for bringing this to our attention. We're sorry to hear about your experience and would like to discuss this further with you. Please reach out to our management team.`
      ]
    };

    const options = templates[review.sentiment];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Identify satisfaction issues that need attention
   */
  public async identifySatisfactionIssues(facilityId: number): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedCount: number;
    recommendation: string;
  }>> {
    const score = await this.calculateReputationScore(facilityId);
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedCount: number;
      recommendation: string;
    }> = [];

    // Check overall rating
    if (score.overallRating < 3.0) {
      issues.push({
        type: 'low_rating',
        severity: 'critical',
        description: `Overall rating is ${score.overallRating}/5`,
        affectedCount: score.totalReviews,
        recommendation: 'Immediate management intervention required'
      });
    } else if (score.overallRating < 4.0) {
      issues.push({
        type: 'moderate_rating',
        severity: 'high',
        description: `Overall rating is ${score.overallRating}/5`,
        affectedCount: score.totalReviews,
        recommendation: 'Review service quality and address common complaints'
      });
    }

    // Check negative sentiment percentage
    if (score.sentiment.negative > 20) {
      issues.push({
        type: 'high_negative_sentiment',
        severity: 'high',
        description: `${score.sentiment.negative.toFixed(1)}% of reviews are negative`,
        affectedCount: Math.round((score.sentiment.negative / 100) * score.totalReviews),
        recommendation: 'Analyze negative reviews and implement improvement plan'
      });
    }

    // Check NPS
    if (score.nps < 0) {
      issues.push({
        type: 'negative_nps',
        severity: 'critical',
        description: `Net Promoter Score is ${score.nps}`,
        affectedCount: 0,
        recommendation: 'Customer satisfaction crisis - immediate action required'
      });
    }

    // Check trending
    if (score.trends.trending === 'down') {
      issues.push({
        type: 'declining_satisfaction',
        severity: 'medium',
        description: 'Satisfaction scores are declining',
        affectedCount: 0,
        recommendation: 'Investigate recent changes and gather customer feedback'
      });
    }

    return issues;
  }

  /**
   * Get recent reviews
   */
  private async getReviews(facilityId: number, instructorId?: number): Promise<Review[]> {
    // Mock data - in production would query reviews table
    return [
      {
        id: 'rev_1',
        userId: 101,
        facilityId,
        instructorId,
        rating: 5,
        comment: 'Amazing facility! Staff was super helpful and the simulators are top-notch.',
        platform: 'google',
        createdAt: new Date(),
        sentiment: 'positive',
        topics: ['staff', 'equipment'],
        responded: false,
        isPublic: true
      },
      {
        id: 'rev_2',
        userId: 102,
        facilityId,
        rating: 4,
        comment: 'Great experience overall. Could use more parking.',
        platform: 'google',
        createdAt: new Date(),
        sentiment: 'positive',
        topics: ['facility'],
        responded: false,
        isPublic: true
      },
      {
        id: 'rev_3',
        userId: 103,
        facilityId,
        rating: 5,
        comment: 'Best golf simulator in town! Highly recommend.',
        platform: 'facebook',
        createdAt: new Date(),
        sentiment: 'positive',
        topics: [],
        responded: true,
        responseText: 'Thank you so much for your kind words!',
        isPublic: true
      }
    ];
  }

  public shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const reviewReputationAgent = ReviewReputationAgent.getInstance();
