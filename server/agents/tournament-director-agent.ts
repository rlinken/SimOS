import { db } from "@db";
import { events, users, bookings, bays } from "@db/schema";
import { eq, and, between, sql, gte } from "drizzle-orm";

/**
 * Tournament Director Agent
 *
 * Responsibilities:
 * - Automate tournament setup and configuration
 * - Manage tournament registrations and team formations
 * - Generate optimized bracket and pairings
 * - Track scores and leaderboards in real-time
 * - Automate tournament communications
 * - Generate post-tournament reports and analytics
 * - Identify and resolve scheduling conflicts
 */

export interface TournamentSetup {
  eventId: number;
  facilityId: number;
  format: 'stroke_play' | 'match_play' | 'scramble' | 'best_ball' | 'skins';
  teamSize: number;
  maxParticipants: number;
  bayAllocation: Array<{ bayId: number; timeSlot: Date }>;
  schedule: TournamentSchedule;
  rules: TournamentRules;
}

export interface TournamentSchedule {
  rounds: Array<{
    roundNumber: number;
    startTime: Date;
    endTime: Date;
    pairings: Array<{
      groupId: string;
      players: number[];
      bayId: number;
      teeTime: Date;
    }>;
  }>;
}

export interface TournamentRules {
  scoringSystem: 'gross' | 'net' | 'stableford';
  handicapSystem: boolean;
  playoffFormat: 'sudden_death' | 'aggregate' | 'match_play';
  prizes: Array<{
    place: number;
    amount?: number;
    description: string;
  }>;
}

export interface Leaderboard {
  eventId: number;
  lastUpdated: Date;
  standings: Array<{
    rank: number;
    playerId: number;
    playerName: string;
    teamName?: string;
    score: number;
    thru: number; // Holes completed
    totalStrokes?: number;
    toPar?: number;
    earnings?: number;
  }>;
}

export interface TournamentStats {
  eventId: number;
  participation: {
    registered: number;
    checkedIn: number;
    completed: number;
    noShows: number;
  };
  scoring: {
    avgScore: number;
    lowRound: number;
    highRound: number;
    acesCount: number;
    eaglesCount: number;
  };
  efficiency: {
    onTimeStarts: number;
    avgRoundTime: number; // minutes
    bayUtilization: number; // percentage
  };
}

class TournamentDirectorAgent {
  private static instance: TournamentDirectorAgent;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TournamentDirectorAgent {
    if (!TournamentDirectorAgent.instance) {
      TournamentDirectorAgent.instance = new TournamentDirectorAgent();
    }
    return TournamentDirectorAgent.instance;
  }

  private async initialize() {
    console.log('🏆 Tournament Director Agent initializing...');
  }

  /**
   * Create optimized tournament setup
   */
  public async createTournamentSetup(
    eventId: number,
    facilityId: number,
    participants: number,
    format: TournamentSetup['format'],
    startTime: Date,
    duration: number // hours
  ): Promise<TournamentSetup> {
    // Get available bays
    const availableBays = await this.getAvailableBays(facilityId, startTime, duration);

    if (availableBays.length === 0) {
      throw new Error('No bays available for tournament');
    }

    // Calculate optimal group size
    const groupSize = format === 'scramble' || format === 'best_ball' ? 4 : 2;
    const groups = Math.ceil(participants / groupSize);

    // Generate bay allocation
    const bayAllocation = this.allocateBays(availableBays, groups, startTime, duration);

    // Generate pairings and schedule
    const schedule = this.generateTournamentSchedule(
      participants,
      groupSize,
      bayAllocation,
      startTime
    );

    // Define rules
    const rules: TournamentRules = {
      scoringSystem: format === 'skins' ? 'gross' : 'net',
      handicapSystem: true,
      playoffFormat: 'sudden_death',
      prizes: this.generatePrizeStructure(participants)
    };

    const setup: TournamentSetup = {
      eventId,
      facilityId,
      format,
      teamSize: groupSize,
      maxParticipants: participants,
      bayAllocation,
      schedule,
      rules
    };

    return setup;
  }

  /**
   * Generate optimal pairings for a round
   */
  public generatePairings(
    participants: number[],
    baysAvailable: number,
    groupSize: number,
    method: 'random' | 'skill_based' | 'snake' = 'random'
  ): Array<{ groupId: string; players: number[] }> {
    const pairings: Array<{ groupId: string; players: number[] }> = [];
    let shuffled = [...participants];

    if (method === 'random') {
      shuffled = this.shuffleArray(shuffled);
    } else if (method === 'skill_based') {
      // Would sort by handicap/skill level
      // For now, just use as-is
    }

    let groupNumber = 1;
    for (let i = 0; i < shuffled.length; i += groupSize) {
      const group = shuffled.slice(i, i + groupSize);
      pairings.push({
        groupId: `Group-${groupNumber}`,
        players: group
      });
      groupNumber++;
    }

    return pairings;
  }

  /**
   * Calculate current leaderboard
   */
  public async calculateLeaderboard(eventId: number): Promise<Leaderboard> {
    // In a real implementation, this would pull from a scores table
    // For now, return a mock leaderboard structure

    const standings = [
      {
        rank: 1,
        playerId: 101,
        playerName: 'John Smith',
        score: -5,
        thru: 18,
        totalStrokes: 67,
        toPar: -5,
        earnings: 1000
      },
      {
        rank: 2,
        playerId: 102,
        playerName: 'Jane Doe',
        score: -3,
        thru: 18,
        totalStrokes: 69,
        toPar: -3,
        earnings: 500
      },
      {
        rank: 3,
        playerId: 103,
        playerName: 'Bob Wilson',
        score: -2,
        thru: 17,
        totalStrokes: 70,
        toPar: -2,
        earnings: 250
      }
    ];

    return {
      eventId,
      lastUpdated: new Date(),
      standings
    };
  }

  /**
   * Generate tournament statistics
   */
  public async generateTournamentStats(eventId: number): Promise<TournamentStats> {
    // Would pull from actual event data
    return {
      eventId,
      participation: {
        registered: 48,
        checkedIn: 45,
        completed: 44,
        noShows: 3
      },
      scoring: {
        avgScore: 78.5,
        lowRound: 67,
        highRound: 92,
        acesCount: 1,
        eaglesCount: 8
      },
      efficiency: {
        onTimeStarts: 42,
        avgRoundTime: 105, // 1h 45min
        bayUtilization: 95
      }
    };
  }

  /**
   * Detect and resolve scheduling conflicts
   */
  public async detectConflicts(
    eventId: number,
    facilityId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>> {
    const conflicts: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Check for overlapping events
    const overlappingEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.facilityId, facilityId),
          sql`${events.id} != ${eventId}`,
          sql`${events.startTime} < ${endTime}`,
          sql`${events.endTime} > ${startTime}`
        )
      );

    if (overlappingEvents.length > 0) {
      conflicts.push({
        type: 'event_overlap',
        description: `Overlaps with ${overlappingEvents.length} other event(s)`,
        severity: 'high'
      });
    }

    // Check for conflicting bay reservations
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          sql`${bookings.startTime} < ${endTime}`,
          sql`${bookings.endTime} > ${startTime}`
        )
      );

    if (overlappingBookings.length > 5) {
      conflicts.push({
        type: 'bay_availability',
        description: `${overlappingBookings.length} bay bookings during tournament`,
        severity: 'medium'
      });
    }

    return conflicts;
  }

  /**
   * Send automated tournament communications
   */
  public async sendTournamentCommunications(
    eventId: number,
    type: 'registration_confirmation' | 'reminder' | 'results' | 'leaderboard_update',
    recipients: number[]
  ): Promise<void> {
    // Would integrate with marketing engine
    console.log(`📧 Sending ${type} to ${recipients.length} participants for event ${eventId}`);
  }

  /**
   * Generate post-tournament report
   */
  public async generateTournamentReport(eventId: number): Promise<{
    summary: string;
    stats: TournamentStats;
    leaderboard: Leaderboard;
    highlights: string[];
    recommendations: string[];
  }> {
    const stats = await this.generateTournamentStats(eventId);
    const leaderboard = await this.calculateLeaderboard(eventId);

    const highlights = [
      `${stats.participation.completed} players completed the tournament`,
      `Low round: ${stats.scoring.lowRound}`,
      `${stats.scoring.acesCount} hole(s)-in-one recorded`,
      `Average completion time: ${stats.efficiency.avgRoundTime} minutes`
    ];

    const recommendations = [
      stats.participation.noShows > 5 ? 'Consider deposit requirement to reduce no-shows' : null,
      stats.efficiency.avgRoundTime > 120 ? 'Implement pace of play monitoring' : null,
      stats.participation.registered > 50 ? 'Facility ready for larger tournaments' : null
    ].filter(Boolean) as string[];

    return {
      summary: `Tournament completed with ${stats.participation.completed} participants. ` +
               `Winner: ${leaderboard.standings[0]?.playerName} with a score of ${leaderboard.standings[0]?.score}.`,
      stats,
      leaderboard,
      highlights,
      recommendations
    };
  }

  // Helper methods

  private async getAvailableBays(
    facilityId: number,
    startTime: Date,
    duration: number
  ): Promise<number[]> {
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    // Get all bays
    const allBays = await db
      .select()
      .from(bays)
      .where(eq(bays.facilityId, facilityId));

    // Get booked bays during this time
    const bookedBays = await db
      .select({ bayId: bookings.bayId })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityId),
          sql`${bookings.startTime} < ${endTime}`,
          sql`${bookings.endTime} > ${startTime}`
        )
      );

    const bookedBayIds = new Set(bookedBays.map(b => b.bayId).filter(Boolean));
    const available = allBays.filter(bay => !bookedBayIds.has(bay.id));

    return available.map(bay => bay.id);
  }

  private allocateBays(
    availableBays: number[],
    groups: number,
    startTime: Date,
    duration: number
  ): TournamentSetup['bayAllocation'] {
    const allocation: TournamentSetup['bayAllocation'] = [];
    const slotsPerBay = Math.ceil(groups / availableBays.length);
    const slotDuration = (duration * 60) / slotsPerBay; // minutes

    for (let slot = 0; slot < slotsPerBay; slot++) {
      const slotTime = new Date(startTime.getTime() + slot * slotDuration * 60 * 1000);

      for (const bayId of availableBays) {
        if (allocation.length >= groups) break;

        allocation.push({
          bayId,
          timeSlot: slotTime
        });
      }

      if (allocation.length >= groups) break;
    }

    return allocation;
  }

  private generateTournamentSchedule(
    participants: number,
    groupSize: number,
    bayAllocation: TournamentSetup['bayAllocation'],
    startTime: Date
  ): TournamentSchedule {
    const playerIds = Array.from({ length: participants }, (_, i) => i + 1);
    const pairings = this.generatePairings(playerIds, bayAllocation.length, groupSize, 'random');

    const roundPairings = pairings.map((pairing, index) => {
      const allocation = bayAllocation[index];
      return {
        groupId: pairing.groupId,
        players: pairing.players,
        bayId: allocation?.bayId || bayAllocation[0].bayId,
        teeTime: allocation?.timeSlot || startTime
      };
    });

    return {
      rounds: [
        {
          roundNumber: 1,
          startTime,
          endTime: new Date(startTime.getTime() + 4 * 60 * 60 * 1000),
          pairings: roundPairings
        }
      ]
    };
  }

  private generatePrizeStructure(participants: number): TournamentRules['prizes'] {
    const prizePool = participants * 50; // $50 per participant

    return [
      { place: 1, amount: prizePool * 0.4, description: '1st Place' },
      { place: 2, amount: prizePool * 0.25, description: '2nd Place' },
      { place: 3, amount: prizePool * 0.15, description: '3rd Place' },
      { place: 0, amount: prizePool * 0.1, description: 'Closest to Pin' },
      { place: 0, amount: prizePool * 0.1, description: 'Longest Drive' }
    ];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const tournamentDirectorAgent = TournamentDirectorAgent.getInstance();
