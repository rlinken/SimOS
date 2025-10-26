import { db } from '../db';
import { bayWearTracking, trackmanShots, bays } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Bay Wear Calculator Service
 * 
 * Calculates wear scores for each shot based on physical impact factors:
 * - Ball speed & club speed (kinetic energy)
 * - Impact quality (centered vs off-center)
 * - Club type (driver/woods cause more wear)
 * - Attack angle (steep angles cause more divot damage)
 * 
 * Aggregates wear data by time period for bay maintenance optimization
 */

export interface WearScore {
  totalScore: number;
  ballSpeedScore: number;
  clubSpeedScore: number;
  impactScore: number;
  clubTypeScore: number;
  attackAngleScore: number;
}

export class BayWearCalculator {
  /**
   * Calculate wear score for a single shot
   * Returns a score from 0-100 representing wear impact
   */
  calculateShotWear(shot: {
    ballSpeed?: string | null;
    clubSpeed?: string | null;
    impactOffsetX?: string | null;
    impactOffsetY?: string | null;
    clubType?: string | null;
    attackAngle?: string | null;
  }): WearScore {
    let totalScore = 0;
    
    // 1. Ball Speed Score (0-25 points)
    // Higher ball speed = more kinetic energy = more wear
    const ballSpeed = shot.ballSpeed ? parseFloat(shot.ballSpeed) : 0;
    const ballSpeedScore = this.scoreBallSpeed(ballSpeed);
    totalScore += ballSpeedScore;
    
    // 2. Club Speed Score (0-25 points)
    // Higher club speed = harder turf contact = more wear
    const clubSpeed = shot.clubSpeed ? parseFloat(shot.clubSpeed) : 0;
    const clubSpeedScore = this.scoreClubSpeed(clubSpeed);
    totalScore += clubSpeedScore;
    
    // 3. Impact Quality Score (0-20 points)
    // Off-center hits = more turf damage
    const impactOffsetX = shot.impactOffsetX ? parseFloat(shot.impactOffsetX) : 0;
    const impactOffsetY = shot.impactOffsetY ? parseFloat(shot.impactOffsetY) : 0;
    const impactScore = this.scoreImpactOffset(impactOffsetX, impactOffsetY);
    totalScore += impactScore;
    
    // 4. Club Type Score (0-20 points)
    // Driver/woods cause more wear than irons/wedges
    const clubTypeScore = this.scoreClubType(shot.clubType);
    totalScore += clubTypeScore;
    
    // 5. Attack Angle Score (0-10 points)
    // Steep downward angles = deeper divots = more wear
    const attackAngle = shot.attackAngle ? parseFloat(shot.attackAngle) : 0;
    const attackAngleScore = this.scoreAttackAngle(attackAngle);
    totalScore += attackAngleScore;
    
    return {
      totalScore,
      ballSpeedScore,
      clubSpeedScore,
      impactScore,
      clubTypeScore,
      attackAngleScore,
    };
  }
  
  /**
   * Score ball speed (0-25 points)
   * Typical range: 0-180 mph
   */
  private scoreBallSpeed(ballSpeed: number): number {
    if (ballSpeed <= 0) return 0;
    
    // Linear scale: 0 mph = 0 points, 180 mph = 25 points
    const normalized = Math.min(ballSpeed / 180, 1.0);
    return normalized * 25;
  }
  
  /**
   * Score club speed (0-25 points)
   * Typical range: 0-130 mph
   */
  private scoreClubSpeed(clubSpeed: number): number {
    if (clubSpeed <= 0) return 0;
    
    // Linear scale: 0 mph = 0 points, 130 mph = 25 points
    const normalized = Math.min(clubSpeed / 130, 1.0);
    return normalized * 25;
  }
  
  /**
   * Score impact offset (0-20 points)
   * Off-center hits cause more turf damage
   * Offset measured in mm from center
   */
  private scoreImpactOffset(offsetX: number, offsetY: number): number {
    // Calculate distance from center
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    
    if (distance <= 0) return 0; // Perfect center = no extra wear
    
    // Exponential penalty for off-center hits
    // 0mm = 0 points, 15mm+ = 20 points
    const normalized = Math.min(distance / 15, 1.0);
    return normalized * normalized * 20; // Square for exponential growth
  }
  
  /**
   * Score club type (0-20 points)
   * Different clubs cause different wear patterns
   */
  private scoreClubType(clubType: string | null | undefined): number {
    if (!clubType) return 10; // Default medium wear
    
    const type = clubType.toLowerCase();
    
    // Driver and woods cause most wear (high speed, shallow divots)
    if (type.includes('driver') || type.includes('dr')) return 20;
    if (type.includes('wood') || type.includes('wd')) return 18;
    if (type.includes('hybrid') || type.includes('hy')) return 15;
    
    // Long irons = medium-high wear
    if (type.includes('3i') || type.includes('4i') || type.includes('5i')) return 12;
    
    // Mid irons = medium wear
    if (type.includes('6i') || type.includes('7i') || type.includes('8i')) return 10;
    
    // Short irons = medium-low wear
    if (type.includes('9i') || type.includes('pw')) return 8;
    
    // Wedges = lower wear (slower speeds, more control)
    if (type.includes('gw') || type.includes('sw') || type.includes('lw')) return 6;
    
    return 10; // Default
  }
  
  /**
   * Score attack angle (0-10 points)
   * Steep downward angles create deeper divots
   */
  private scoreAttackAngle(attackAngle: number): number {
    // Negative = downward (divot), Positive = upward (driver)
    // More negative = more wear
    
    if (attackAngle >= 0) return 0; // Upward = minimal turf contact
    
    const steepness = Math.abs(attackAngle);
    
    // Linear scale: 0° = 0 points, 10°+ down = 10 points
    const normalized = Math.min(steepness / 10, 1.0);
    return normalized * 10;
  }
  
  /**
   * Update bay wear tracking after a shot
   * Aggregates data by time period (daily/weekly/monthly)
   */
  async updateBayWear(
    facilityId: string,
    bayId: string,
    wearScore: number,
    isBooked: boolean,
    timestamp: Date
  ): Promise<void> {
    const period = this.getCurrentPeriod(timestamp);
    
    try {
      // Try to find existing tracking record for this period
      const existing = await db.query.bayWearTracking.findFirst({
        where: and(
          eq(bayWearTracking.facilityId, facilityId),
          eq(bayWearTracking.bayId, bayId),
          eq(bayWearTracking.period, period)
        ),
      });
      
      if (existing) {
        // Update existing record
        const newTotalShots = existing.totalShots + 1;
        const newBookedShots = isBooked ? existing.bookedShots + 1 : existing.bookedShots;
        const newWalkInShots = !isBooked ? existing.walkInShots + 1 : existing.walkInShots;
        const newTotalWearScore = parseFloat(existing.totalWearScore) + wearScore;
        const newAverageWearScore = newTotalWearScore / newTotalShots;
        
        await db
          .update(bayWearTracking)
          .set({
            totalShots: newTotalShots,
            bookedShots: newBookedShots,
            walkInShots: newWalkInShots,
            totalWearScore: newTotalWearScore.toString(),
            averageWearScore: newAverageWearScore.toString(),
          })
          .where(eq(bayWearTracking.id, existing.id));
      } else {
        // Create new tracking record
        await db.insert(bayWearTracking).values({
          facilityId,
          bayId,
          period,
          totalShots: 1,
          bookedShots: isBooked ? 1 : 0,
          walkInShots: isBooked ? 0 : 1,
          totalWearScore: wearScore.toString(),
          averageWearScore: wearScore.toString(),
        });
      }
      
      // Also update cumulative lifetime tracking
      await this.updateLifetimeWear(facilityId, bayId, wearScore, isBooked);
      
    } catch (error) {
      console.error('Error updating bay wear tracking:', error);
      throw error;
    }
  }
  
  /**
   * Update lifetime cumulative wear for a bay
   */
  private async updateLifetimeWear(
    facilityId: string,
    bayId: string,
    wearScore: number,
    isBooked: boolean
  ): Promise<void> {
    const lifetimePeriod = 'lifetime';
    
    const existing = await db.query.bayWearTracking.findFirst({
      where: and(
        eq(bayWearTracking.facilityId, facilityId),
        eq(bayWearTracking.bayId, bayId),
        eq(bayWearTracking.period, lifetimePeriod)
      ),
    });
    
    if (existing) {
      const newTotalShots = existing.totalShots + 1;
      const newBookedShots = isBooked ? existing.bookedShots + 1 : existing.bookedShots;
      const newWalkInShots = !isBooked ? existing.walkInShots + 1 : existing.walkInShots;
      const newTotalWearScore = parseFloat(existing.totalWearScore) + wearScore;
      const newAverageWearScore = newTotalWearScore / newTotalShots;
      
      await db
        .update(bayWearTracking)
        .set({
          totalShots: newTotalShots,
          bookedShots: newBookedShots,
          walkInShots: newWalkInShots,
          totalWearScore: newTotalWearScore.toString(),
          averageWearScore: newAverageWearScore.toString(),
        })
        .where(eq(bayWearTracking.id, existing.id));
    } else {
      await db.insert(bayWearTracking).values({
        facilityId,
        bayId,
        period: lifetimePeriod,
        totalShots: 1,
        bookedShots: isBooked ? 1 : 0,
        walkInShots: isBooked ? 0 : 1,
        totalWearScore: wearScore.toString(),
        averageWearScore: wearScore.toString(),
      });
    }
  }
  
  /**
   * Get current period identifier (YYYY-MM-DD format)
   */
  private getCurrentPeriod(timestamp: Date): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Get current wear scores for all bays in a facility
   * Used by smart bay assignment algorithm
   */
  async getBayWearScores(facilityId: string): Promise<Map<string, number>> {
    const wearMap = new Map<string, number>();
    
    // Get lifetime wear for all bays
    const lifetimeRecords = await db.query.bayWearTracking.findMany({
      where: and(
        eq(bayWearTracking.facilityId, facilityId),
        eq(bayWearTracking.period, 'lifetime')
      ),
    });
    
    for (const record of lifetimeRecords) {
      wearMap.set(record.bayId, parseFloat(record.totalWearScore));
    }
    
    // Fill in zeros for bays with no wear data
    const facilityBays = await db.query.bays.findMany({
      where: eq(bays.facilityId, facilityId),
    });
    
    for (const bay of facilityBays) {
      if (!wearMap.has(bay.id)) {
        wearMap.set(bay.id, 0);
      }
    }
    
    return wearMap;
  }
}

// Singleton instance
export const bayWearCalculator = new BayWearCalculator();
