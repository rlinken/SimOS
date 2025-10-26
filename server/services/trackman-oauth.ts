/**
 * Trackman OAuth 2.0 Service
 * 
 * Handles OAuth authentication, token refresh, and credential management for Trackman API
 */

import { db } from '../db';
import { facilities, trackmanTokens, type Facility, type TrackmanToken } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  scope?: string;
}

interface TrackmanCredentials {
  clientId: string;
  clientSecret: string;
  apiUrl: string;
}

export class TrackmanOAuthService {
  /**
   * Get facility's Trackman credentials
   */
  private async getCredentials(facilityId: string): Promise<TrackmanCredentials | null> {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility?.trackmanClientId || !facility?.trackmanClientSecret) {
      return null;
    }

    return {
      clientId: facility.trackmanClientId,
      clientSecret: facility.trackmanClientSecret,
      apiUrl: facility.trackmanApiUrl || 'https://api.trackman.com',
    };
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(
    facilityId: string,
    authorizationCode: string,
    redirectUri: string
  ): Promise<TrackmanToken | null> {
    const credentials = await this.getCredentials(facilityId);
    if (!credentials) {
      throw new Error('Trackman credentials not configured for this facility');
    }

    try {
      // Call Trackman OAuth token endpoint
      const response = await fetch(`${credentials.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: redirectUri,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Trackman token exchange failed:', error);
        throw new Error(`Failed to exchange code for tokens: ${response.statusText}`);
      }

      const tokenData: TokenResponse = await response.json();

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      // Check if tokens already exist for this facility
      const existingTokens = await db.query.trackmanTokens.findFirst({
        where: eq(trackmanTokens.facilityId, facilityId),
      });

      let savedTokens: TrackmanToken;

      if (existingTokens) {
        // Update existing tokens
        const [updated] = await db
          .update(trackmanTokens)
          .set({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenType: tokenData.token_type,
            expiresAt,
            scope: tokenData.scope,
            lastRefreshedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(trackmanTokens.id, existingTokens.id))
          .returning();
        
        savedTokens = updated;
      } else {
        // Insert new tokens
        const [inserted] = await db
          .insert(trackmanTokens)
          .values({
            facilityId,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenType: tokenData.token_type,
            expiresAt,
            scope: tokenData.scope,
            lastRefreshedAt: new Date(),
          })
          .returning();
        
        savedTokens = inserted;
      }

      console.log(`✅ Trackman OAuth tokens saved for facility ${facilityId}`);
      return savedTokens;
    } catch (error) {
      console.error('Error exchanging Trackman authorization code:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(facilityId: string): Promise<TrackmanToken | null> {
    const credentials = await this.getCredentials(facilityId);
    if (!credentials) {
      throw new Error('Trackman credentials not configured for this facility');
    }

    const existingTokens = await db.query.trackmanTokens.findFirst({
      where: eq(trackmanTokens.facilityId, facilityId),
    });

    if (!existingTokens) {
      throw new Error('No Trackman tokens found for this facility');
    }

    try {
      // Call Trackman OAuth refresh endpoint
      const response = await fetch(`${credentials.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: existingTokens.refreshToken,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Trackman token refresh failed:', error);
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const tokenData: TokenResponse = await response.json();

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      // Update tokens
      const [updated] = await db
        .update(trackmanTokens)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || existingTokens.refreshToken, // Some providers don't return new refresh token
          tokenType: tokenData.token_type,
          expiresAt,
          scope: tokenData.scope,
          lastRefreshedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(trackmanTokens.id, existingTokens.id))
        .returning();

      console.log(`🔄 Trackman access token refreshed for facility ${facilityId}`);
      return updated;
    } catch (error) {
      console.error('Error refreshing Trackman access token:', error);
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidAccessToken(facilityId: string): Promise<string | null> {
    const tokens = await db.query.trackmanTokens.findFirst({
      where: eq(trackmanTokens.facilityId, facilityId),
    });

    if (!tokens) {
      return null;
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiryBuffer = new Date(tokens.expiresAt);
    expiryBuffer.setMinutes(expiryBuffer.getMinutes() - 5);

    if (now >= expiryBuffer) {
      console.log(`⏰ Trackman token expiring soon for facility ${facilityId}, refreshing...`);
      const refreshedTokens = await this.refreshAccessToken(facilityId);
      return refreshedTokens?.accessToken || null;
    }

    return tokens.accessToken;
  }

  /**
   * Check if facility has valid Trackman integration configured
   */
  async isConfigured(facilityId: string): Promise<boolean> {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility?.trackmanEnabled) {
      return false;
    }

    if (!facility.trackmanClientId || !facility.trackmanClientSecret) {
      return false;
    }

    // Check if we have tokens
    const tokens = await db.query.trackmanTokens.findFirst({
      where: eq(trackmanTokens.facilityId, facilityId),
    });

    return !!tokens;
  }

  /**
   * Revoke Trackman tokens and disable integration
   */
  async revokeAccess(facilityId: string): Promise<void> {
    // Delete tokens
    await db.delete(trackmanTokens).where(eq(trackmanTokens.facilityId, facilityId));

    // Optionally disable integration
    await db
      .update(facilities)
      .set({ trackmanEnabled: false })
      .where(eq(facilities.id, facilityId));

    console.log(`🔒 Trackman access revoked for facility ${facilityId}`);
  }
}

// Export singleton instance
export const trackmanOAuthService = new TrackmanOAuthService();
