/**
 * Marketing Engine - Core orchestrator for GolfMarketingOS
 * 
 * Listens to events, evaluates triggers, and dispatches messages through channels
 */

import { eventBus, MarketingEvent, MarketingEventData } from './event-bus';
import { ChannelAdapterFactory, MessagePayload } from './channel-adapters';
import { db } from '../db';
import { 
  marketingEvents,
  marketingTriggers,
  marketingTemplates,
  marketingContactPreferences,
  marketingMessageQueue,
  marketingDeliveryLog,
  users,
} from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export class MarketingEngine {
  private initialized = false;

  /**
   * Initialize the marketing engine and set up event listeners
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🎯 Initializing GolfMarketingOS...');

    // Subscribe to all marketing events
    eventBus.on('swing_pattern_detected', (data) => this.handleEvent('swing_pattern_detected', data));
    eventBus.on('session_completed', (data) => this.handleEvent('session_completed', data));
    eventBus.on('booking_created', (data) => this.handleEvent('booking_created', data));
    eventBus.on('booking_no_show', (data) => this.handleEvent('booking_no_show', data));
    eventBus.on('membership_expiring', (data) => this.handleEvent('membership_expiring', data));
    eventBus.on('inactivity_detected', (data) => this.handleEvent('inactivity_detected', data));
    eventBus.on('milestone_achieved', (data) => this.handleEvent('milestone_achieved', data));

    this.initialized = true;
    console.log('✅ GolfMarketingOS initialized successfully');
  }

  /**
   * Handle incoming marketing event
   */
  private async handleEvent<T extends MarketingEvent>(
    eventType: T,
    eventData: MarketingEventData[T]
  ): Promise<void> {
    try {
      const data = eventData as any;
      
      // Store event in database
      await db.insert(marketingEvents).values({
        facilityId: data.facilityId,
        eventType,
        userId: data.userId,
        bookingId: data.bookingId,
        eventData: data,
        processed: false,
      });

      // Find active triggers for this event type
      const triggers = await db.query.marketingTriggers.findMany({
        where: and(
          eq(marketingTriggers.facilityId, data.facilityId),
          eq(marketingTriggers.eventType, eventType),
          eq(marketingTriggers.status, 'active')
        ),
        with: {
          template: true,
          segment: true,
        },
      });

      // Process each trigger
      for (const trigger of triggers) {
        await this.processTrigger(trigger, data);
      }
    } catch (error) {
      console.error(`Error handling ${eventType} event:`, error);
    }
  }

  /**
   * Process a trigger and send message if conditions are met
   */
  private async processTrigger(trigger: any, eventData: any): Promise<void> {
    try {
      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, eventData.userId),
      });

      if (!user) {
        console.log(`User ${eventData.userId} not found for trigger ${trigger.id}`);
        return;
      }

      // Check contact preferences (scoped to facility for multi-tenant isolation)
      const preferences = await db.query.marketingContactPreferences.findFirst({
        where: and(
          eq(marketingContactPreferences.userId, user.id),
          eq(marketingContactPreferences.facilityId, eventData.facilityId)
        ),
      });

      // Check if user opted out of this channel
      if (preferences) {
        if (trigger.channel === 'email' && !preferences.emailOptIn) return;
        if (trigger.channel === 'sms' && !preferences.smsOptIn) return;
        if (!preferences.marketingOptIn) return; // Global marketing opt-out
      }

      // Check cooldown period (scoped to facility for multi-tenant isolation)
      if (trigger.cooldownHours) {
        const cooldownTime = new Date();
        cooldownTime.setHours(cooldownTime.getHours() - trigger.cooldownHours);

        const recentMessage = await db.query.marketingDeliveryLog.findFirst({
          where: and(
            eq(marketingDeliveryLog.facilityId, eventData.facilityId),
            eq(marketingDeliveryLog.userId, user.id),
            eq(marketingDeliveryLog.channel, trigger.channel),
            gte(marketingDeliveryLog.createdAt, cooldownTime)
          ),
        });

        if (recentMessage) {
          console.log(`User ${user.id} in cooldown period for trigger ${trigger.id}`);
          return;
        }
      }

      // Render template with user data
      const renderedMessage = this.renderTemplate(trigger.template, user, eventData);

      // Queue the message
      await this.queueMessage({
        facilityId: trigger.facilityId,
        userId: user.id,
        channel: trigger.channel,
        subject: renderedMessage.subject,
        body: renderedMessage.body,
        campaignId: trigger.campaignId,
        triggerId: trigger.id,
      });

      console.log(`✉️ Queued ${trigger.channel} message for user ${user.id} via trigger ${trigger.name}`);
    } catch (error) {
      console.error(`Error processing trigger ${trigger.id}:`, error);
    }
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: any, user: any, eventData: any): { subject?: string; body: string } {
    const variables: Record<string, string> = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      ...eventData,
    };

    let subject = template.subject || '';
    let body = template.body || '';

    // Replace {{variable}} with actual values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
    }

    return { subject, body };
  }

  /**
   * Queue message for delivery
   */
  private async queueMessage(message: {
    facilityId: string;
    userId: string;
    channel: string;
    subject?: string;
    body: string;
    campaignId?: string;
    triggerId?: string;
  }): Promise<void> {
    await db.insert(marketingMessageQueue).values({
      facilityId: message.facilityId,
      userId: message.userId,
      channel: message.channel as any,
      subject: message.subject,
      body: message.body,
      campaignId: message.campaignId,
      triggerId: message.triggerId,
      status: 'queued',
      scheduledFor: new Date(),
      idempotencyKey: `${message.userId}-${message.triggerId}-${Date.now()}`,
    });
  }

  /**
   * Process message queue (call this periodically)
   */
  async processMessageQueue(): Promise<void> {
    try {
      // Get queued messages ready to send (scheduled time has passed)
      const messages = await db.query.marketingMessageQueue.findMany({
        where: and(
          eq(marketingMessageQueue.status, 'queued'),
          sql`${marketingMessageQueue.scheduledFor} <= ${new Date().toISOString()}`
        ),
        limit: 100,
        with: {
          user: true,
        },
      });

      for (const message of messages) {
        await this.sendMessage(message);
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    }
  }

  /**
   * Send a single message through appropriate channel
   */
  private async sendMessage(message: any): Promise<void> {
    try {
      // Update status to sending
      await db
        .update(marketingMessageQueue)
        .set({ status: 'sending', lastAttemptAt: new Date() })
        .where(eq(marketingMessageQueue.id, message.id));

      // Get channel adapter
      const adapter = ChannelAdapterFactory.getAdapter(message.channel);

      // Send message
      const payload: MessagePayload = {
        recipient: {
          userId: message.user.id,
          email: message.user.email,
          phone: message.user.phone,
          firstName: message.user.firstName,
          lastName: message.user.lastName,
        },
        subject: message.subject,
        body: message.body,
      };

      const result = await adapter.send(payload);

      if (result.success) {
        // Update message status
        await db
          .update(marketingMessageQueue)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(marketingMessageQueue.id, message.id));

        // Log delivery
        await db.insert(marketingDeliveryLog).values({
          facilityId: message.facilityId,
          messageId: message.id,
          userId: message.userId,
          channel: message.channel,
          status: 'sent',
          externalId: result.externalId,
          deliveredAt: new Date(),
        });
      } else {
        // Update with error
        await db
          .update(marketingMessageQueue)
          .set({
            status: 'failed',
            errorMessage: result.errorMessage,
            attempts: sql`${marketingMessageQueue.attempts} + 1`,
          })
          .where(eq(marketingMessageQueue.id, message.id));
      }
    } catch (error: any) {
      console.error(`Error sending message ${message.id}:`, error);
      
      // Update with error
      await db
        .update(marketingMessageQueue)
        .set({
          status: 'failed',
          errorMessage: error.message,
          attempts: sql`${marketingMessageQueue.attempts} + 1`,
        })
        .where(eq(marketingMessageQueue.id, message.id));
    }
  }
}

// Export singleton instance
export const marketingEngine = new MarketingEngine();
