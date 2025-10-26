/**
 * Channel Adapters - Pluggable interfaces for different marketing channels
 * 
 * Each adapter handles sending messages through a specific channel (email, SMS, etc.)
 */

export interface MessagePayload {
  recipient: {
    userId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  };
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  externalId?: string; // Provider's message ID
  errorMessage?: string;
}

/**
 * Base interface all channel adapters must implement
 */
export interface ChannelAdapter {
  send(payload: MessagePayload): Promise<SendResult>;
  getChannelType(): string;
}

/**
 * Email Channel Adapter
 */
export class EmailChannelAdapter implements ChannelAdapter {
  constructor(private config?: { apiKey?: string; from?: string }) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    // TODO: Integrate with email provider (SendGrid, Resend, etc.)
    // For now, just log
    console.log('[EMAIL] Would send:', {
      to: payload.recipient.email,
      subject: payload.subject,
      body: payload.body,
    });

    return {
      success: true,
      externalId: `email_${Date.now()}`,
    };
  }

  getChannelType(): string {
    return 'email';
  }
}

/**
 * SMS Channel Adapter
 */
export class SMSChannelAdapter implements ChannelAdapter {
  constructor(private config?: { apiKey?: string; from?: string }) {}

  async send(payload: MessagePayload): Promise<SendResult> {
    // TODO: Integrate with Twilio or similar
    console.log('[SMS] Would send:', {
      to: payload.recipient.phone,
      body: payload.body,
    });

    return {
      success: true,
      externalId: `sms_${Date.now()}`,
    };
  }

  getChannelType(): string {
    return 'sms';
  }
}

/**
 * In-App Banner Channel Adapter
 */
export class BannerChannelAdapter implements ChannelAdapter {
  async send(payload: MessagePayload): Promise<SendResult> {
    // This doesn't actually "send" - banners are pulled by frontend
    // Just log for now
    console.log('[BANNER] Would display:', {
      userId: payload.recipient.userId,
      body: payload.body,
    });

    return {
      success: true,
      externalId: `banner_${Date.now()}`,
    };
  }

  getChannelType(): string {
    return 'in_app_banner';
  }
}

/**
 * In-App Notification Channel Adapter
 */
export class NotificationChannelAdapter implements ChannelAdapter {
  async send(payload: MessagePayload): Promise<SendResult> {
    // TODO: Store in database for user to see in notifications panel
    console.log('[NOTIFICATION] Would notify:', {
      userId: payload.recipient.userId,
      body: payload.body,
    });

    return {
      success: true,
      externalId: `notification_${Date.now()}`,
    };
  }

  getChannelType(): string {
    return 'in_app_notification';
  }
}

/**
 * Channel Adapter Factory
 */
export class ChannelAdapterFactory {
  private static adapters: Map<string, ChannelAdapter> = new Map();

  static getAdapter(channel: string): ChannelAdapter {
    // Return cached adapter if exists
    if (this.adapters.has(channel)) {
      return this.adapters.get(channel)!;
    }

    // Create new adapter
    let adapter: ChannelAdapter;
    switch (channel) {
      case 'email':
        adapter = new EmailChannelAdapter();
        break;
      case 'sms':
        adapter = new SMSChannelAdapter();
        break;
      case 'in_app_banner':
        adapter = new BannerChannelAdapter();
        break;
      case 'in_app_notification':
        adapter = new NotificationChannelAdapter();
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }

    this.adapters.set(channel, adapter);
    return adapter;
  }
}
