/**
 * Channel Adapters - Pluggable interfaces for different marketing channels
 * 
 * Each adapter handles sending messages through a specific channel (email, SMS, etc.)
 */

import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

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
  externalId?: string;
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
 * Email Channel Adapter - Uses SendGrid
 */
export class EmailChannelAdapter implements ChannelAdapter {
  private initialized = false;
  private fromEmail: string;

  constructor(private config?: { apiKey?: string; from?: string }) {
    const apiKey = config?.apiKey || process.env.SENDGRID_API_KEY;
    this.fromEmail = config?.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@golfsimos.com';
    
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
      console.log('[EMAIL] SendGrid initialized successfully');
    } else {
      console.log('[EMAIL] SendGrid not configured - emails will be logged only');
    }
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!payload.recipient.email) {
      return {
        success: false,
        errorMessage: 'No email address provided',
      };
    }

    if (!this.initialized) {
      console.log('[EMAIL] Would send (SendGrid not configured):', {
        to: payload.recipient.email,
        subject: payload.subject,
        bodyLength: payload.body?.length || 0,
      });
      return {
        success: true,
        externalId: `email_mock_${Date.now()}`,
      };
    }

    try {
      const msg = {
        to: payload.recipient.email,
        from: this.fromEmail,
        subject: payload.subject || 'Message from GolfSimOS',
        text: payload.body,
        html: this.formatEmailHtml(payload),
      };

      const response = await sgMail.send(msg);
      console.log('[EMAIL] Sent successfully to:', payload.recipient.email);
      
      return {
        success: true,
        externalId: response[0]?.headers?.['x-message-id'] || `email_${Date.now()}`,
      };
    } catch (error: any) {
      console.error('[EMAIL] Failed to send:', error.message);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private formatEmailHtml(payload: MessagePayload): string {
    const recipientName = payload.recipient.firstName 
      ? `Hi ${payload.recipient.firstName},` 
      : 'Hi,';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GolfSimOS</h1>
            </div>
            <div class="content">
              <p>${recipientName}</p>
              <p>${payload.body.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="footer">
              <p>Sent via GolfSimOS Marketing Platform</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  getChannelType(): string {
    return 'email';
  }
}

/**
 * SMS Channel Adapter - Uses Twilio
 */
export class SMSChannelAdapter implements ChannelAdapter {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor(private config?: { accountSid?: string; authToken?: string; from?: string }) {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config?.from || process.env.TWILIO_PHONE_NUMBER || null;

    if (accountSid && authToken && this.fromNumber) {
      this.client = twilio(accountSid, authToken);
      console.log('[SMS] Twilio initialized successfully');
    } else {
      console.log('[SMS] Twilio not configured - SMS will be logged only');
    }
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!payload.recipient.phone) {
      return {
        success: false,
        errorMessage: 'No phone number provided',
      };
    }

    if (!this.client || !this.fromNumber) {
      console.log('[SMS] Would send (Twilio not configured):', {
        to: payload.recipient.phone,
        bodyLength: payload.body?.length || 0,
      });
      return {
        success: true,
        externalId: `sms_mock_${Date.now()}`,
      };
    }

    try {
      const message = await this.client.messages.create({
        body: payload.body,
        to: this.formatPhoneNumber(payload.recipient.phone),
        from: this.fromNumber,
      });

      console.log('[SMS] Sent successfully to:', payload.recipient.phone);
      
      return {
        success: true,
        externalId: message.sid,
      };
    } catch (error: any) {
      console.error('[SMS] Failed to send:', error.message);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (!phone.startsWith('+')) {
      return `+${cleaned}`;
    }
    return phone;
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
    if (this.adapters.has(channel)) {
      return this.adapters.get(channel)!;
    }

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

  static clearCache(): void {
    this.adapters.clear();
  }
}
