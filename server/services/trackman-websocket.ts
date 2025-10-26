/**
 * Trackman WebSocket Service
 * 
 * Manages real-time WebSocket connections to Trackman API to capture shot data
 * from all bays (both booked sessions and walk-in activity)
 */

import WebSocket from 'ws';
import { db } from '../db';
import { 
  trackmanSessions, 
  trackmanShots,
  facilities,
  bookings,
  type TrackmanSession,
  type InsertTrackmanSession,
  type InsertTrackmanShot
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { TrackmanOAuthService } from './trackman-oauth';
import { eventBus } from '../marketing/event-bus';
import { bayWearCalculator } from './bay-wear-calculator';
import { swingPatternDetector } from './swing-pattern-detector';

interface TrackmanShotData {
  shotId: string;
  timestamp: string;
  bayNumber: number;
  
  // Ball data
  ballSpeed?: number;
  totalSpin?: number;
  backSpin?: number;
  sideSpin?: number;
  spinAxis?: number;
  launchAngle?: number;
  launchDirection?: number;
  
  // Club data
  clubSpeed?: number;
  attackAngle?: number;
  clubPath?: number;
  faceAngle?: number;
  faceToPath?: number;
  dynamicLoft?: number;
  
  // Impact
  smashFactor?: number;
  impactOffset?: number;
  
  // Distance
  carryDistance?: number;
  totalDistance?: number;
  offline?: number;
  curve?: number;
  maxHeight?: number;
  landingAngle?: number;
  hangTime?: number;
  
  // Club type
  club?: string;
}

interface TrackmanSessionStart {
  sessionId: string;
  bayNumber: number;
  timestamp: string;
  userId?: string; // If user is logged in
}

interface TrackmanSessionEnd {
  sessionId: string;
  timestamp: string;
  totalShots: number;
}

interface WebSocketMessage {
  type: 'session_start' | 'shot' | 'session_end' | 'heartbeat';
  data: TrackmanSessionStart | TrackmanShotData | TrackmanSessionEnd | null;
}

export class TrackmanWebSocketService {
  private connections: Map<string, WebSocket> = new Map(); // facilityId -> WebSocket
  private activeSessions: Map<string, string> = new Map(); // trackmanSessionId -> dbSessionId
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private shouldReconnect: Map<string, boolean> = new Map(); // facilityId -> should auto-reconnect
  private oauthService: TrackmanOAuthService;

  constructor() {
    this.oauthService = new TrackmanOAuthService();
  }

  /**
   * Start WebSocket connection for a facility
   */
  async connect(facilityId: string): Promise<void> {
    // Check if already connected
    if (this.connections.has(facilityId)) {
      console.log(`WebSocket already connected for facility ${facilityId}`);
      return;
    }

    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility?.trackmanClientId) {
      throw new Error(`Trackman not configured for facility ${facilityId}`);
    }

    // Get valid access token
    const token = await this.oauthService.getValidAccessToken(facilityId);
    if (!token) {
      throw new Error(`Failed to get valid Trackman token for facility ${facilityId}`);
    }

    const wsUrl = `${facility.trackmanApiUrl || 'wss://api.trackman.com'}/v1/realtime`;
    
    // Enable auto-reconnect before attempting connection
    // This ensures reconnection even if connection fails before 'open' event
    this.shouldReconnect.set(facilityId, true);
    
    try {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      ws.on('open', () => {
        console.log(`✅ Trackman WebSocket connected for facility ${facilityId}`);
        this.connections.set(facilityId, ws);
        
        // Clear any reconnect timer
        const timer = this.reconnectTimers.get(facilityId);
        if (timer) {
          clearTimeout(timer);
          this.reconnectTimers.delete(facilityId);
        }
      });

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(facilityId, message);
        } catch (error) {
          console.error(`Error parsing Trackman message for facility ${facilityId}:`, error);
        }
      });

      ws.on('error', (error) => {
        console.error(`Trackman WebSocket error for facility ${facilityId}:`, error);
      });

      ws.on('close', () => {
        console.log(`Trackman WebSocket closed for facility ${facilityId}`);
        this.connections.delete(facilityId);
        
        // Only auto-reconnect if not manually disconnected
        if (this.shouldReconnect.get(facilityId)) {
          const timer = setTimeout(() => {
            console.log(`Attempting to reconnect Trackman WebSocket for facility ${facilityId}`);
            this.connect(facilityId).catch(err => {
              console.error(`Failed to reconnect Trackman WebSocket:`, err);
            });
          }, 5000);
          
          this.reconnectTimers.set(facilityId, timer);
        }
      });

    } catch (error) {
      console.error(`Failed to connect Trackman WebSocket for facility ${facilityId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket for a facility
   */
  disconnect(facilityId: string): void {
    // Disable auto-reconnect before closing
    this.shouldReconnect.set(facilityId, false);
    
    const ws = this.connections.get(facilityId);
    if (ws) {
      ws.close();
      this.connections.delete(facilityId);
    }

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(facilityId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(facilityId);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(facilityId: string, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'session_start':
        await this.handleSessionStart(facilityId, message.data as TrackmanSessionStart);
        break;
      
      case 'shot':
        await this.handleShot(facilityId, message.data as TrackmanShotData);
        break;
      
      case 'session_end':
        await this.handleSessionEnd(facilityId, message.data as TrackmanSessionEnd);
        break;
      
      case 'heartbeat':
        // Just log heartbeat, no action needed
        break;
      
      default:
        console.warn(`Unknown message type from Trackman:`, message.type);
    }
  }

  /**
   * Handle session start event
   */
  private async handleSessionStart(
    facilityId: string, 
    data: TrackmanSessionStart
  ): Promise<void> {
    try {
      // Check if there's an active booking for this bay at this time
      const now = new Date(data.timestamp);
      const bayNumber = data.bayNumber;

      // Find the bay
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, facilityId),
        with: {
          bays: true,
        },
      });

      const bay = facility?.bays.find(b => b.number === bayNumber);
      if (!bay) {
        console.warn(`Bay ${bayNumber} not found for facility ${facilityId}`);
        return;
      }

      // Try to find an active booking for this bay at this time
      // Note: bookings have bayIds array, duration, and must be active (not cancelled)
      const facilityBookings = await db.query.bookings.findMany({
        where: eq(bookings.facilityId, facilityId),
      });
      
      // Find booking that:
      // 1. Includes this bay in bayIds array
      // 2. Is active at the session start time (within booking time window)
      const activeBooking = facilityBookings.find(booking => {
        if (!booking.bayIds.includes(bay.id)) return false;
        
        // Check if session time falls within booking window
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        
        return now >= bookingStart && now <= bookingEnd;
      });

      // Create session record
      const sessionData: InsertTrackmanSession = {
        facilityId,
        bayId: bay.id,
        bookingId: activeBooking?.id || null,
        userId: data.userId || activeBooking?.userId || null,
        trackmanSessionId: data.sessionId,
        startTime: now,
        sessionType: activeBooking ? 'booked' : 'walk_in',
      };

      const [session] = await db
        .insert(trackmanSessions)
        .values(sessionData)
        .returning();

      // Track the session mapping
      this.activeSessions.set(data.sessionId, session.id);

      console.log(`📊 Trackman session started: ${session.id} (${session.sessionType})`);
    } catch (error) {
      console.error('Error handling Trackman session start:', error);
    }
  }

  /**
   * Handle shot data event
   */
  private async handleShot(facilityId: string, data: TrackmanShotData): Promise<void> {
    try {
      // Find the bay for this shot
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, facilityId),
        with: {
          bays: true,
        },
      });

      const bay = facility?.bays.find(b => b.number === data.bayNumber);
      if (!bay) {
        console.warn(`Bay ${data.bayNumber} not found for facility ${facilityId}`);
        return;
      }

      // Try to find active session, or create one if needed
      let sessionId: string | undefined;
      
      // First check if we have an active session for this bay
      const recentSession = await db.query.trackmanSessions.findFirst({
        where: and(
          eq(trackmanSessions.facilityId, facilityId),
          eq(trackmanSessions.bayId, bay.id),
        ),
        orderBy: (sessions, { desc }) => [desc(sessions.startTime)],
      });

      // If session exists and is recent (within last hour), use it
      if (recentSession && 
          new Date().getTime() - new Date(recentSession.startTime).getTime() < 3600000) {
        sessionId = recentSession.id;
      } else {
        // Create a new walk-in session
        // Use a synthetic trackman session ID that can be referenced later
        const trackmanSessionId = `auto-${Date.now()}-${data.bayNumber}`;
        
        const [newSession] = await db
          .insert(trackmanSessions)
          .values({
            facilityId,
            bayId: bay.id,
            bookingId: null,
            userId: null,
            trackmanSessionId,
            startTime: new Date(data.timestamp),
            sessionType: 'walk_in',
          })
          .returning();
        
        sessionId = newSession.id;
        
        // Register in active sessions so session_end can find it
        this.activeSessions.set(trackmanSessionId, newSession.id);
        
        console.log(`📊 Auto-created walk-in session: ${newSession.id} (trackman ID: ${trackmanSessionId})`);
      }

      // Get shot number for this session
      const existingShotCount = await db.query.trackmanShots.findMany({
        where: eq(trackmanShots.sessionId, sessionId),
      });
      const shotNumber = existingShotCount.length + 1;

      // Store shot data (convert numbers to strings for numeric fields)
      const shotData: InsertTrackmanShot = {
        sessionId,
        facilityId,
        shotNumber,
        timestamp: new Date(data.timestamp),
        trackmanShotId: data.shotId,
        
        // Ball data
        ballSpeed: data.ballSpeed?.toString(),
        totalSpin: data.totalSpin?.toString(),
        backSpin: data.backSpin?.toString(),
        sideSpin: data.sideSpin?.toString(),
        spinAxis: data.spinAxis?.toString(),
        launchAngle: data.launchAngle?.toString(),
        launchDirection: data.launchDirection?.toString(),
        
        // Club data
        clubSpeed: data.clubSpeed?.toString(),
        attackAngle: data.attackAngle?.toString(),
        clubPath: data.clubPath?.toString(),
        faceAngle: data.faceAngle?.toString(),
        faceToPath: data.faceToPath?.toString(),
        dynamicLoft: data.dynamicLoft?.toString(),
        
        // Impact
        smashFactor: data.smashFactor?.toString(),
        impactOffset: data.impactOffset?.toString(),
        
        // Distance
        carryDistance: data.carryDistance?.toString(),
        totalDistance: data.totalDistance?.toString(),
        offline: data.offline?.toString(),
        curve: data.curve?.toString(),
        maxHeight: data.maxHeight?.toString(),
        landingAngle: data.landingAngle?.toString(),
        hangTime: data.hangTime?.toString(),
        
        // Club type
        club: data.club,
      };

      const [shot] = await db
        .insert(trackmanShots)
        .values(shotData)
        .returning();

      // Get session to determine if booked or walk-in
      const session = await db.query.trackmanSessions.findFirst({
        where: eq(trackmanSessions.id, sessionId),
      });

      // Calculate wear score for this shot
      const wearScore = bayWearCalculator.calculateShotWear({
        ballSpeed: shot.ballSpeed,
        clubSpeed: shot.clubSpeed,
        impactOffsetX: shot.impactOffsetX,
        impactOffsetY: shot.impactOffsetY,
        clubType: shot.club,
        attackAngle: shot.attackAngle,
      });

      // Update bay wear tracking
      const isBooked = session?.sessionType === 'booked';
      await bayWearCalculator.updateBayWear(
        facilityId,
        bay.id,
        wearScore.totalScore,
        isBooked,
        new Date(data.timestamp)
      );

      // Add shot to swing pattern detector for session-level analysis
      // Only track booked sessions (we need user context for marketing)
      if (session?.userId && session?.bookingId) {
        swingPatternDetector.addShot(session.id, {
          shotId: shot.id,
          spinAxis: shot.spinAxis ? parseFloat(shot.spinAxis) : null,
          curve: shot.curve ? parseFloat(shot.curve) : null,
          offline: shot.offline ? parseFloat(shot.offline) : null,
          faceToPath: shot.faceToPath ? parseFloat(shot.faceToPath) : null,
          clubPath: shot.clubPath ? parseFloat(shot.clubPath) : null,
          ballSpeed: shot.ballSpeed ? parseFloat(shot.ballSpeed) : null,
          carryDistance: shot.carryDistance ? parseFloat(shot.carryDistance) : null,
          impactOffset: shot.impactOffset ? parseFloat(shot.impactOffset) : null,
          smashFactor: shot.smashFactor ? parseFloat(shot.smashFactor) : null,
          club: shot.club,
        });
        
        // Emit raw shot event for real-time tracking
        await eventBus.emit('trackman.shot_captured', {
          userId: session.userId,
          facilityId,
          timestamp: new Date(),
          data: {
            sessionId: session.id,
            shotId: shot.id,
            bookingId: session.bookingId,
            bayId: bay.id,
            shotData: data,
          },
        });
      }

      console.log(`⛳ Shot captured: ${shot.id} (wear: ${wearScore.totalScore.toFixed(2)}, session: ${sessionId})`);
    } catch (error) {
      console.error('Error handling Trackman shot:', error);
    }
  }

  /**
   * Handle session end event
   */
  private async handleSessionEnd(
    facilityId: string,
    data: TrackmanSessionEnd
  ): Promise<void> {
    try {
      const dbSessionId = this.activeSessions.get(data.sessionId);
      if (!dbSessionId) {
        console.warn(`Session ${data.sessionId} not found in active sessions`);
        return;
      }

      // Update session with end time and total shots
      await db
        .update(trackmanSessions)
        .set({
          endTime: new Date(data.timestamp),
          totalShots: data.totalShots,
          updatedAt: new Date(),
        })
        .where(eq(trackmanSessions.id, dbSessionId));

      // Remove from active sessions
      this.activeSessions.delete(data.sessionId);

      console.log(`📊 Trackman session ended: ${dbSessionId} (${data.totalShots} shots)`);

      // Emit session complete event to marketing engine
      const session = await db.query.trackmanSessions.findFirst({
        where: eq(trackmanSessions.id, dbSessionId),
      });

      if (session?.userId && session?.bookingId) {
        // Emit session complete event
        await eventBus.emit('trackman.session_completed', {
          userId: session.userId,
          facilityId,
          timestamp: new Date(),
          data: {
            sessionId: session.id,
            bookingId: session.bookingId,
            totalShots: data.totalShots,
          },
        });
        
        // Analyze swing patterns and emit marketing events
        console.log(`🔍 Analyzing swing patterns for session ${session.id}...`);
        const patterns = await swingPatternDetector.analyzeSession(
          session.id,
          session.userId,
          facilityId,
          session.bookingId
        );
        
        if (Object.keys(patterns).length > 0) {
          console.log(`✅ Pattern analysis complete:`, patterns);
        } else {
          console.log(`ℹ️ No patterns detected (may need more shots)`);
        }
      }
    } catch (error) {
      console.error('Error handling Trackman session end:', error);
    }
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    const facilityIds = Array.from(this.connections.keys());
    for (const facilityId of facilityIds) {
      this.disconnect(facilityId);
    }
  }
}

// Singleton instance
let trackmanWebSocketService: TrackmanWebSocketService | null = null;

export function getTrackmanWebSocketService(): TrackmanWebSocketService {
  if (!trackmanWebSocketService) {
    trackmanWebSocketService = new TrackmanWebSocketService();
  }
  return trackmanWebSocketService;
}
