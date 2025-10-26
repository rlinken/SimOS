/**
 * Swing Pattern Detection Service
 * 
 * Analyzes Trackman shot data to detect common swing issues:
 * - Slice (left-to-right ball flight for right-handed golfer)
 * - Hook (right-to-left ball flight)
 * - Distance loss (below expected distance for club type)
 * - Poor contact (off-center hits, inconsistent ball speed)
 * 
 * Emits marketing events for booked sessions to trigger automated campaigns
 */

import { eventBus } from '../marketing/event-bus';

export interface SwingPattern {
  slice?: {
    detected: boolean;
    severity: 'mild' | 'moderate' | 'severe';
    confidence: number; // 0-1
    metrics: {
      avgSpinAxis?: number;
      avgCurve?: number;
      avgFaceToPath?: number;
    };
  };
  hook?: {
    detected: boolean;
    severity: 'mild' | 'moderate' | 'severe';
    confidence: number;
    metrics: {
      avgSpinAxis?: number;
      avgCurve?: number;
      avgFaceToPath?: number;
    };
  };
  distanceLoss?: {
    detected: boolean;
    severity: 'mild' | 'moderate' | 'severe';
    confidence: number;
    metrics: {
      avgBallSpeed?: number;
      avgCarryDistance?: number;
      expectedDistance?: number;
    };
  };
  poorContact?: {
    detected: boolean;
    severity: 'mild' | 'moderate' | 'severe';
    confidence: number;
    metrics: {
      avgImpactOffset?: number;
      ballSpeedVariation?: number;
      smashFactorAvg?: number;
    };
  };
}

export interface ShotAnalysisData {
  shotId: string;
  
  // Ball flight data
  spinAxis?: number | null;
  curve?: number | null;
  offline?: number | null;
  
  // Club data
  faceToPath?: number | null;
  clubPath?: number | null;
  
  // Distance
  ballSpeed?: number | null;
  carryDistance?: number | null;
  
  // Contact quality
  impactOffset?: number | null;
  smashFactor?: number | null;
  
  // Club type
  club?: string | null;
}

export class SwingPatternDetector {
  private sessionShots: Map<string, ShotAnalysisData[]> = new Map();
  private readonly MIN_SHOTS_FOR_PATTERN = 5; // Minimum shots to detect pattern
  
  /**
   * Add a shot to session analysis buffer
   */
  addShot(sessionId: string, shotData: ShotAnalysisData): void {
    if (!this.sessionShots.has(sessionId)) {
      this.sessionShots.set(sessionId, []);
    }
    this.sessionShots.get(sessionId)!.push(shotData);
  }
  
  /**
   * Analyze session shots for patterns and emit events
   */
  async analyzeSession(
    sessionId: string,
    userId: string,
    facilityId: string,
    bookingId: string
  ): Promise<SwingPattern> {
    try {
      const shots = this.sessionShots.get(sessionId) || [];
      
      if (shots.length < this.MIN_SHOTS_FOR_PATTERN) {
        console.log(`⚠️ Not enough shots for pattern analysis: ${shots.length} (minimum: ${this.MIN_SHOTS_FOR_PATTERN})`);
        return {};
      }
      
      const patterns: SwingPattern = {};
      
      // Detect slice pattern
      const slicePattern = this.detectSlice(shots);
      if (slicePattern.detected) {
        patterns.slice = slicePattern;
        
        // Emit marketing event for slice detection
        await eventBus.emit('swing_pattern.slice_detected', {
          userId,
          facilityId,
          timestamp: new Date(),
          data: {
            sessionId,
            bookingId,
            severity: slicePattern.severity,
            confidence: slicePattern.confidence,
            metrics: slicePattern.metrics,
          },
        });
        
        console.log(`🎯 Slice pattern detected for user ${userId} (severity: ${slicePattern.severity}, confidence: ${slicePattern.confidence.toFixed(2)})`);
      }
      
      // Detect hook pattern
      const hookPattern = this.detectHook(shots);
      if (hookPattern.detected) {
        patterns.hook = hookPattern;
        
        await eventBus.emit('swing_pattern.hook_detected', {
          userId,
          facilityId,
          timestamp: new Date(),
          data: {
            sessionId,
            bookingId,
            severity: hookPattern.severity,
            confidence: hookPattern.confidence,
            metrics: hookPattern.metrics,
          },
        });
        
        console.log(`🎯 Hook pattern detected for user ${userId} (severity: ${hookPattern.severity}, confidence: ${hookPattern.confidence.toFixed(2)})`);
      }
      
      // Detect distance loss
      const distancePattern = this.detectDistanceLoss(shots);
      if (distancePattern.detected) {
        patterns.distanceLoss = distancePattern;
        
        await eventBus.emit('swing_pattern.distance_loss_detected', {
          userId,
          facilityId,
          timestamp: new Date(),
          data: {
            sessionId,
            bookingId,
            severity: distancePattern.severity,
            confidence: distancePattern.confidence,
            metrics: distancePattern.metrics,
          },
        });
        
        console.log(`🎯 Distance loss detected for user ${userId} (severity: ${distancePattern.severity})`);
      }
      
      // Detect poor contact
      const contactPattern = this.detectPoorContact(shots);
      if (contactPattern.detected) {
        patterns.poorContact = contactPattern;
        
        await eventBus.emit('swing_pattern.poor_contact_detected', {
          userId,
          facilityId,
          timestamp: new Date(),
          data: {
            sessionId,
            bookingId,
            severity: contactPattern.severity,
            confidence: contactPattern.confidence,
            metrics: contactPattern.metrics,
          },
        });
        
        console.log(`🎯 Poor contact pattern detected for user ${userId} (severity: ${contactPattern.severity})`);
      }
      
      return patterns;
    } finally {
      // Always clean up session data to prevent memory leaks
      this.sessionShots.delete(sessionId);
    }
  }
  
  /**
   * Detect slice pattern
   * Slice characteristics:
   * - Positive spin axis (ball curves left-to-right for RH golfer)
   * - Positive curve (offline right)
   * - Face open to path
   */
  private detectSlice(shots: ShotAnalysisData[]): SwingPattern['slice'] & { detected: boolean } {
    const validShots = shots.filter(s => 
      s.spinAxis !== null && s.spinAxis !== undefined &&
      s.curve !== null && s.curve !== undefined
    );
    
    if (validShots.length < this.MIN_SHOTS_FOR_PATTERN) {
      return { detected: false, severity: 'mild', confidence: 0, metrics: {} };
    }
    
    const avgSpinAxis = this.average(validShots.map(s => s.spinAxis!));
    const avgCurve = this.average(validShots.map(s => s.curve!));
    const avgFaceToPath = this.average(
      validShots.filter(s => s.faceToPath !== null).map(s => s.faceToPath!)
    );
    
    // Slice indicators:
    // - Spin axis > +10° (positive = slice)
    // - Curve > +15 yards right
    // - Face-to-path > +2° (face open)
    const spinAxisScore = avgSpinAxis > 10 ? Math.min((avgSpinAxis - 10) / 20, 1) : 0;
    const curveScore = avgCurve > 15 ? Math.min((avgCurve - 15) / 30, 1) : 0;
    const faceToPathScore = avgFaceToPath > 2 ? Math.min((avgFaceToPath - 2) / 6, 1) : 0;
    
    const confidence = (spinAxisScore + curveScore + (faceToPathScore || 0)) / (faceToPathScore ? 3 : 2);
    
    if (confidence < 0.4) {
      return { detected: false, severity: 'mild', confidence, metrics: {} };
    }
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (confidence > 0.7) severity = 'severe';
    else if (confidence > 0.5) severity = 'moderate';
    
    return {
      detected: true,
      severity,
      confidence,
      metrics: {
        avgSpinAxis,
        avgCurve,
        avgFaceToPath: avgFaceToPath || undefined,
      },
    };
  }
  
  /**
   * Detect hook pattern
   * Hook characteristics:
   * - Negative spin axis (ball curves right-to-left for RH golfer)
   * - Negative curve (offline left)
   * - Face closed to path
   */
  private detectHook(shots: ShotAnalysisData[]): SwingPattern['hook'] & { detected: boolean } {
    const validShots = shots.filter(s => 
      s.spinAxis !== null && s.spinAxis !== undefined &&
      s.curve !== null && s.curve !== undefined
    );
    
    if (validShots.length < this.MIN_SHOTS_FOR_PATTERN) {
      return { detected: false, severity: 'mild', confidence: 0, metrics: {} };
    }
    
    const avgSpinAxis = this.average(validShots.map(s => s.spinAxis!));
    const avgCurve = this.average(validShots.map(s => s.curve!));
    const avgFaceToPath = this.average(
      validShots.filter(s => s.faceToPath !== null).map(s => s.faceToPath!)
    );
    
    // Hook indicators:
    // - Spin axis < -10° (negative = hook)
    // - Curve < -15 yards left
    // - Face-to-path < -2° (face closed)
    const spinAxisScore = avgSpinAxis < -10 ? Math.min((Math.abs(avgSpinAxis) - 10) / 20, 1) : 0;
    const curveScore = avgCurve < -15 ? Math.min((Math.abs(avgCurve) - 15) / 30, 1) : 0;
    const faceToPathScore = avgFaceToPath < -2 ? Math.min((Math.abs(avgFaceToPath) - 2) / 6, 1) : 0;
    
    const confidence = (spinAxisScore + curveScore + (faceToPathScore || 0)) / (faceToPathScore ? 3 : 2);
    
    if (confidence < 0.4) {
      return { detected: false, severity: 'mild', confidence, metrics: {} };
    }
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (confidence > 0.7) severity = 'severe';
    else if (confidence > 0.5) severity = 'moderate';
    
    return {
      detected: true,
      severity,
      confidence,
      metrics: {
        avgSpinAxis,
        avgCurve,
        avgFaceToPath: avgFaceToPath || undefined,
      },
    };
  }
  
  /**
   * Detect distance loss
   * Compares actual carry distance to expected distance for club type
   */
  private detectDistanceLoss(shots: ShotAnalysisData[]): SwingPattern['distanceLoss'] & { detected: boolean } {
    const validShots = shots.filter(s => 
      s.carryDistance !== null && s.carryDistance !== undefined &&
      s.club !== null && s.club !== undefined
    );
    
    if (validShots.length < this.MIN_SHOTS_FOR_PATTERN) {
      return { detected: false, severity: 'mild', confidence: 0, metrics: {} };
    }
    
    const avgCarryDistance = this.average(validShots.map(s => s.carryDistance!));
    const avgBallSpeed = this.average(
      validShots.filter(s => s.ballSpeed !== null).map(s => s.ballSpeed!)
    );
    
    // Estimate expected distance based on club type
    // Using typical amateur distances
    const club = validShots[0].club!.toLowerCase();
    let expectedDistance = 200; // Default
    
    if (club.includes('driver') || club.includes('dr')) expectedDistance = 220;
    else if (club.includes('3w') || club.includes('3 wood')) expectedDistance = 200;
    else if (club.includes('5w') || club.includes('5 wood')) expectedDistance = 180;
    else if (club.includes('3i')) expectedDistance = 180;
    else if (club.includes('4i')) expectedDistance = 170;
    else if (club.includes('5i')) expectedDistance = 160;
    else if (club.includes('6i')) expectedDistance = 150;
    else if (club.includes('7i')) expectedDistance = 140;
    else if (club.includes('8i')) expectedDistance = 130;
    else if (club.includes('9i')) expectedDistance = 120;
    else if (club.includes('pw')) expectedDistance = 110;
    
    const distanceRatio = avgCarryDistance / expectedDistance;
    
    // Distance loss if actual distance is <80% of expected
    if (distanceRatio >= 0.8) {
      return { detected: false, severity: 'mild', confidence: 0, metrics: {} };
    }
    
    const confidence = Math.min((0.8 - distanceRatio) / 0.3, 1);
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (distanceRatio < 0.6) severity = 'severe'; // <60% of expected
    else if (distanceRatio < 0.7) severity = 'moderate'; // <70% of expected
    
    return {
      detected: true,
      severity,
      confidence,
      metrics: {
        avgBallSpeed: avgBallSpeed || undefined,
        avgCarryDistance,
        expectedDistance,
      },
    };
  }
  
  /**
   * Detect poor contact quality
   * Based on impact offset, ball speed variation, and smash factor
   */
  private detectPoorContact(shots: ShotAnalysisData[]): SwingPattern['poorContact'] & { detected: boolean } {
    const validShots = shots.filter(s => 
      s.impactOffset !== null && s.impactOffset !== undefined
    );
    
    if (validShots.length < this.MIN_SHOTS_FOR_PATTERN) {
      return { detected: false, severity: 'mild', confidence: 0, metrics: {} };
    }
    
    const avgImpactOffset = this.average(validShots.map(s => Math.abs(s.impactOffset!)));
    
    const ballSpeedShots = shots.filter(s => s.ballSpeed !== null && s.ballSpeed !== undefined);
    const ballSpeedVariation = ballSpeedShots.length > 1 
      ? this.standardDeviation(ballSpeedShots.map(s => s.ballSpeed!))
      : 0;
    
    const smashFactorShots = shots.filter(s => s.smashFactor !== null && s.smashFactor !== undefined);
    const smashFactorAvg = smashFactorShots.length > 0
      ? this.average(smashFactorShots.map(s => s.smashFactor!))
      : 0;
    
    // Poor contact indicators:
    // - Impact offset > 10mm from center
    // - Ball speed variation > 10 mph
    // - Smash factor < 1.35 (for driver/woods)
    const offsetScore = avgImpactOffset > 10 ? Math.min((avgImpactOffset - 10) / 15, 1) : 0;
    const variationScore = ballSpeedVariation > 10 ? Math.min((ballSpeedVariation - 10) / 15, 1) : 0;
    const smashScore = smashFactorAvg > 0 && smashFactorAvg < 1.35 ? Math.min((1.35 - smashFactorAvg) / 0.2, 1) : 0;
    
    const confidence = (offsetScore + variationScore + smashScore) / 3;
    
    if (confidence < 0.4) {
      return { detected: false, severity: 'mild', confidence, metrics: {} };
    }
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (confidence > 0.7) severity = 'severe';
    else if (confidence > 0.5) severity = 'moderate';
    
    return {
      detected: true,
      severity,
      confidence,
      metrics: {
        avgImpactOffset,
        ballSpeedVariation,
        smashFactorAvg: smashFactorAvg || undefined,
      },
    };
  }
  
  /**
   * Calculate average of an array of numbers
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.average(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}

// Singleton instance
export const swingPatternDetector = new SwingPatternDetector();
