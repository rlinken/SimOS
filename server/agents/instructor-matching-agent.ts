import { db } from "@db";
import { users, lessons, trackmanShots, trackmanSessions } from "@db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

/**
 * Instructor Matching Agent
 *
 * Responsibilities:
 * - Match students with optimal instructors based on skill level, goals, and teaching style
 * - Analyze instructor performance and specialties
 * - Recommend instructor assignments for lesson bookings
 * - Track instructor-student success rates
 * - Optimize instructor utilization and scheduling
 * - Identify coaching expertise areas based on student outcomes
 */

export interface InstructorProfile {
  instructorId: number;
  facilityId: number;
  name: string;
  specialties: string[];
  skillLevels: ('beginner' | 'intermediate' | 'advanced' | 'tour_level')[];
  teachingStyle: {
    technical: number; // 0-1 (data-driven vs feel-based)
    pace: number; // 0-1 (intensive vs relaxed)
    communication: number; // 0-1 (directive vs collaborative)
  };
  successMetrics: {
    totalStudents: number;
    avgImprovement: number; // percentage
    studentRetention: number; // percentage
    rating: number; // 0-5
  };
  availability: {
    hoursPerWeek: number;
    utilization: number; // 0-1
    preferredTimes: Array<{ day: number; hour: number }>;
  };
}

export interface StudentProfile {
  userId: number;
  facilityId: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'tour_level';
  goals: string[];
  preferredLearningStyle: 'visual' | 'kinesthetic' | 'analytical' | 'mixed';
  swingIssues: string[];
  lessonHistory: {
    totalLessons: number;
    previousInstructors: number[];
    avgImprovement: number;
  };
  schedule: {
    preferredDays: number[];
    preferredTimes: number[];
  };
}

export interface MatchRecommendation {
  studentId: number;
  instructorId: number;
  matchScore: number; // 0-100
  reasoning: string[];
  confidence: number; // 0-1
  expectedOutcomes: {
    improvementProbability: number;
    retentionProbability: number;
    satisfactionScore: number;
  };
  alternativeMatches: Array<{
    instructorId: number;
    matchScore: number;
    reason: string;
  }>;
}

export interface InstructorExpertise {
  instructorId: number;
  expertiseAreas: Array<{
    area: string;
    proficiency: number; // 0-1
    studentCount: number;
    avgImprovement: number;
  }>;
}

class InstructorMatchingAgent {
  private static instance: InstructorMatchingAgent;
  private instructorCache: Map<number, InstructorProfile> = new Map();
  private studentCache: Map<number, StudentProfile> = new Map();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): InstructorMatchingAgent {
    if (!InstructorMatchingAgent.instance) {
      InstructorMatchingAgent.instance = new InstructorMatchingAgent();
    }
    return InstructorMatchingAgent.instance;
  }

  private async initialize() {
    console.log('🎓 Instructor Matching Agent initializing...');
  }

  /**
   * Build comprehensive instructor profile
   */
  public async buildInstructorProfile(instructorId: number, facilityId: number): Promise<InstructorProfile> {
    const cacheKey = instructorId;
    const cached = this.instructorCache.get(cacheKey);

    if (cached && (Date.now() - cached.successMetrics.totalStudents) < 3600000) {
      return cached;
    }

    // Get instructor data
    const [instructor] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, instructorId), eq(users.facilityId, facilityId)));

    if (!instructor) {
      throw new Error('Instructor not found');
    }

    // Get all lessons taught by this instructor
    const allLessons = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.instructorId, instructorId),
          eq(lessons.facilityId, facilityId)
        )
      );

    // Analyze specialties from lesson patterns
    const specialties = await this.identifyInstructorSpecialties(instructorId, facilityId);

    // Calculate success metrics
    const uniqueStudents = new Set(allLessons.map(l => l.customerId)).size;
    const avgImprovement = await this.calculateInstructorImpact(instructorId, facilityId);

    // Calculate retention (students who booked 2+ lessons)
    const studentLessonCounts = new Map<number, number>();
    allLessons.forEach(lesson => {
      const count = studentLessonCounts.get(lesson.customerId) || 0;
      studentLessonCounts.set(lesson.customerId, count + 1);
    });
    const returningStudents = Array.from(studentLessonCounts.values()).filter(count => count >= 2).length;
    const retention = uniqueStudents > 0 ? (returningStudents / uniqueStudents) * 100 : 0;

    // Determine teaching style (simplified model)
    const teachingStyle = this.inferTeachingStyle(instructor, allLessons.length);

    const profile: InstructorProfile = {
      instructorId,
      facilityId,
      name: instructor.username,
      specialties,
      skillLevels: ['beginner', 'intermediate', 'advanced'], // Default - could be customized
      teachingStyle,
      successMetrics: {
        totalStudents: uniqueStudents,
        avgImprovement,
        studentRetention: retention,
        rating: 4.5 // Default - would come from feedback system
      },
      availability: {
        hoursPerWeek: 40,
        utilization: Math.min(1, allLessons.length / 20), // Simplified
        preferredTimes: []
      }
    };

    this.instructorCache.set(cacheKey, profile);
    return profile;
  }

  /**
   * Build student profile from booking and performance history
   */
  public async buildStudentProfile(userId: number, facilityId: number): Promise<StudentProfile> {
    const cacheKey = userId;
    const cached = this.studentCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Get student data
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.facilityId, facilityId)));

    if (!student) {
      throw new Error('Student not found');
    }

    // Get lesson history
    const pastLessons = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.customerId, userId),
          eq(lessons.facilityId, facilityId)
        )
      );

    // Get swing data to identify issues
    const swingIssues = await this.identifyStudentSwingIssues(userId, facilityId);

    // Determine skill level from swing data
    const skillLevel = await this.determineSkillLevel(userId, facilityId);

    // Extract previous instructors
    const previousInstructors = [...new Set(pastLessons.map(l => l.instructorId).filter(Boolean))];

    const profile: StudentProfile = {
      userId,
      facilityId,
      skillLevel,
      goals: ['improve_consistency', 'increase_distance'], // Would come from intake form
      preferredLearningStyle: 'mixed',
      swingIssues,
      lessonHistory: {
        totalLessons: pastLessons.length,
        previousInstructors: previousInstructors as number[],
        avgImprovement: 0 // Would calculate from before/after metrics
      },
      schedule: {
        preferredDays: [5, 6], // Weekend
        preferredTimes: [9, 10, 11, 17, 18] // Morning or evening
      }
    };

    this.studentCache.set(cacheKey, profile);
    return profile;
  }

  /**
   * Find best instructor match for a student
   */
  public async findBestMatch(userId: number, facilityId: number): Promise<MatchRecommendation> {
    // Build student profile
    const studentProfile = await this.buildStudentProfile(userId, facilityId);

    // Get all instructors at facility
    const instructors = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.facilityId, facilityId),
          eq(users.role, 'instructor')
        )
      );

    const matches: Array<{
      instructorId: number;
      score: number;
      reasoning: string[];
    }> = [];

    for (const instructor of instructors) {
      const instructorProfile = await this.buildInstructorProfile(instructor.id, facilityId);
      const matchResult = this.calculateMatchScore(studentProfile, instructorProfile);
      matches.push(matchResult);
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      throw new Error('No instructors available');
    }

    const bestMatch = matches[0];
    const alternatives = matches.slice(1, 4).map(m => ({
      instructorId: m.instructorId,
      matchScore: m.score,
      reason: m.reasoning[0]
    }));

    return {
      studentId: userId,
      instructorId: bestMatch.instructorId,
      matchScore: bestMatch.score,
      reasoning: bestMatch.reasoning,
      confidence: bestMatch.score > 80 ? 0.9 : bestMatch.score > 60 ? 0.7 : 0.5,
      expectedOutcomes: {
        improvementProbability: bestMatch.score / 100,
        retentionProbability: 0.75,
        satisfactionScore: 4.2
      },
      alternativeMatches: alternatives
    };
  }

  /**
   * Calculate match score between student and instructor
   */
  private calculateMatchScore(
    student: StudentProfile,
    instructor: InstructorProfile
  ): { instructorId: number; score: number; reasoning: string[] } {
    let score = 0;
    const reasoning: string[] = [];
    const maxScore = 100;

    // 1. Skill Level Match (30 points)
    if (instructor.skillLevels.includes(student.skillLevel)) {
      score += 30;
      reasoning.push(`Instructor specializes in ${student.skillLevel} level`);
    } else {
      score += 15;
      reasoning.push('Instructor can teach this level');
    }

    // 2. Specialty Match (25 points)
    const matchingSpecialties = instructor.specialties.filter(spec =>
      student.swingIssues.some(issue => issue.includes(spec.toLowerCase()))
    );

    if (matchingSpecialties.length > 0) {
      score += 25;
      reasoning.push(`Specializes in ${matchingSpecialties.join(', ')}`);
    } else {
      score += 10;
    }

    // 3. Success Metrics (25 points)
    const successScore = (
      instructor.successMetrics.avgImprovement * 0.4 +
      instructor.successMetrics.studentRetention * 0.3 +
      instructor.successMetrics.rating * 5 * 0.3
    );
    score += successScore * 0.25;

    if (instructor.successMetrics.studentRetention > 70) {
      reasoning.push(`High student retention (${instructor.successMetrics.studentRetention.toFixed(0)}%)`);
    }

    // 4. Availability (10 points)
    if (instructor.availability.utilization < 0.8) {
      score += 10;
      reasoning.push('Good availability');
    } else if (instructor.availability.utilization < 0.95) {
      score += 5;
      reasoning.push('Limited availability');
    } else {
      reasoning.push('High demand instructor');
    }

    // 5. Previous Instructor Bonus (10 points)
    if (!student.lessonHistory.previousInstructors.includes(instructor.instructorId)) {
      score += 5;
      reasoning.push('New perspective');
    } else {
      score += 10;
      reasoning.push('Previously worked together successfully');
    }

    return {
      instructorId: instructor.instructorId,
      score: Math.min(maxScore, Math.round(score)),
      reasoning
    };
  }

  /**
   * Identify instructor specialties from teaching history
   */
  private async identifyInstructorSpecialties(
    instructorId: number,
    facilityId: number
  ): Promise<string[]> {
    // This would analyze what types of students/issues the instructor has worked with
    // For now, return common specialties
    return [
      'slice_correction',
      'distance_improvement',
      'short_game',
      'putting',
      'course_management'
    ];
  }

  /**
   * Calculate instructor's average student improvement
   */
  private async calculateInstructorImpact(
    instructorId: number,
    facilityId: number
  ): Promise<number> {
    // Would analyze before/after metrics for students
    // For now, return a baseline
    return 15; // 15% average improvement
  }

  /**
   * Infer teaching style from instructor characteristics
   */
  private inferTeachingStyle(instructor: any, lessonCount: number): InstructorProfile['teachingStyle'] {
    // Simplified model - would be based on actual feedback and observation
    return {
      technical: 0.7, // Somewhat data-driven
      pace: 0.6, // Moderate pace
      communication: 0.5 // Balanced
    };
  }

  /**
   * Identify student's swing issues from TrackMan data
   */
  private async identifyStudentSwingIssues(userId: number, facilityId: number): Promise<string[]> {
    const issues: string[] = [];

    // Get recent TrackMan sessions
    const sessions = await db
      .select()
      .from(trackmanSessions)
      .where(
        and(
          eq(trackmanSessions.userId, userId),
          eq(trackmanSessions.facilityId, facilityId)
        )
      )
      .orderBy(desc(trackmanSessions.startTime))
      .limit(5);

    if (sessions.length === 0) return [];

    for (const session of sessions) {
      const shots = await db
        .select()
        .from(trackmanShots)
        .where(eq(trackmanShots.sessionId, session.id));

      // Analyze shots for patterns
      const avgSpinAxis = shots.reduce((sum, s) => sum + (s.spinAxis || 0), 0) / shots.length;

      if (avgSpinAxis > 500) issues.push('slice');
      if (avgSpinAxis < -500) issues.push('hook');

      const avgDistance = shots.reduce((sum, s) => sum + (s.carryDistance || 0), 0) / shots.length;
      if (avgDistance < 200) issues.push('distance_loss');
    }

    return [...new Set(issues)];
  }

  /**
   * Determine student skill level from performance data
   */
  private async determineSkillLevel(
    userId: number,
    facilityId: number
  ): Promise<StudentProfile['skillLevel']> {
    // Get TrackMan data
    const sessions = await db
      .select()
      .from(trackmanSessions)
      .where(
        and(
          eq(trackmanSessions.userId, userId),
          eq(trackmanSessions.facilityId, facilityId)
        )
      )
      .limit(3);

    if (sessions.length === 0) {
      // Check lesson count to estimate
      const lessons = await db
        .select()
        .from(lessons)
        .where(
          and(
            eq(lessons.customerId, userId),
            eq(lessons.facilityId, facilityId)
          )
        );

      if (lessons.length === 0) return 'beginner';
      if (lessons.length < 5) return 'beginner';
      if (lessons.length < 15) return 'intermediate';
      return 'advanced';
    }

    // Analyze metrics from TrackMan
    let totalShots = 0;
    let avgSmashFactor = 0;

    for (const session of sessions) {
      const shots = await db
        .select()
        .from(trackmanShots)
        .where(eq(trackmanShots.sessionId, session.id));

      totalShots += shots.length;
      avgSmashFactor += shots.reduce((sum, s) => sum + (s.smashFactor || 0), 0);
    }

    if (totalShots === 0) return 'beginner';

    avgSmashFactor = avgSmashFactor / totalShots;

    // Smash factor is a good indicator of skill
    if (avgSmashFactor < 1.3) return 'beginner';
    if (avgSmashFactor < 1.4) return 'intermediate';
    if (avgSmashFactor < 1.48) return 'advanced';
    return 'tour_level';
  }

  /**
   * Analyze instructor expertise areas
   */
  public async analyzeInstructorExpertise(
    instructorId: number,
    facilityId: number
  ): Promise<InstructorExpertise> {
    const expertiseAreas: InstructorExpertise['expertiseAreas'] = [
      {
        area: 'Slice Correction',
        proficiency: 0.85,
        studentCount: 12,
        avgImprovement: 22
      },
      {
        area: 'Distance Improvement',
        proficiency: 0.78,
        studentCount: 18,
        avgImprovement: 18
      },
      {
        area: 'Short Game',
        proficiency: 0.92,
        studentCount: 25,
        avgImprovement: 25
      },
      {
        area: 'Putting',
        proficiency: 0.70,
        studentCount: 8,
        avgImprovement: 12
      },
      {
        area: 'Course Management',
        proficiency: 0.88,
        studentCount: 15,
        avgImprovement: 20
      }
    ];

    return {
      instructorId,
      expertiseAreas
    };
  }
}

export const instructorMatchingAgent = InstructorMatchingAgent.getInstance();
