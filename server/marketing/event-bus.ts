/**
 * Event Bus - Simple in-memory event dispatcher for GolfMarketingOS
 * 
 * This is a lightweight implementation that can be upgraded to
 * a proper message queue (Kafka, NATS, etc.) when scaling is needed.
 */

type EventHandler<T = any> = (data: T) => void | Promise<void>;

interface EventSubscription {
  event: string;
  handler: EventHandler;
}

class EventBus {
  private subscriptions: EventSubscription[] = [];

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    this.subscriptions.push({ event, handler });

    // Return unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter(
        (sub) => sub.event !== event || sub.handler !== handler
      );
    };
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<T = any>(event: string, data: T): Promise<void> {
    const handlers = this.subscriptions
      .filter((sub) => sub.event === event)
      .map((sub) => sub.handler);

    // Execute all handlers in parallel
    await Promise.allSettled(
      handlers.map((handler) =>
        Promise.resolve(handler(data)).catch((error) => {
          console.error(`Error in event handler for ${event}:`, error);
          throw error;
        })
      )
    );
  }

  /**
   * Get count of subscriptions for an event
   */
  getSubscriptionCount(event: string): number {
    return this.subscriptions.filter((sub) => sub.event === event).length;
  }

  /**
   * Remove all subscriptions for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.subscriptions = this.subscriptions.filter((sub) => sub.event !== event);
    } else {
      this.subscriptions = [];
    }
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Event type definitions for type safety
export type MarketingEventData = {
  swing_pattern_detected: {
    userId: string;
    bookingId: string;
    facilityId: string;
    pattern: 'slice' | 'hook' | 'poor_contact' | 'low_distance';
    severity: 'low' | 'medium' | 'high';
    shots: number;
    avgDeviation?: number;
  };
  session_completed: {
    userId: string;
    bookingId: string;
    facilityId: string;
    totalShots: number;
    duration: number;
    avgBallSpeed?: number;
    avgCarry?: number;
  };
  booking_created: {
    userId: string;
    bookingId: string;
    facilityId: string;
    bookingType: string;
  };
  booking_no_show: {
    userId: string;
    bookingId: string;
    facilityId: string;
  };
  membership_expiring: {
    userId: string;
    facilityId: string;
    membershipTierId: string;
    daysUntilExpiry: number;
  };
  inactivity_detected: {
    userId: string;
    facilityId: string;
    daysSinceLastVisit: number;
  };
  milestone_achieved: {
    userId: string;
    facilityId: string;
    milestone: string;
    value: number;
  };
};

export type MarketingEvent = keyof MarketingEventData;
