/**
 * Golf Simulator Business AI Agents
 *
 * Central export for all autonomous business intelligence agents.
 * Each agent operates independently while being coordinated through the agent-coordinator.
 */

// Agent Coordinator (Central Hub)
export {
  agentCoordinator,
  getAgentStatus,
  getAllAgentStatuses,
  getSystemStats,
  coordinateTask
} from './agent-coordinator';

export type {
  AgentStatus,
  AgentCoordinatorConfig
} from './agent-coordinator';

// Customer Success Agent
export { customerSuccessAgent } from './customer-success-agent';
export type {
  CustomerHealthScore,
  ChurnRiskAlert,
  UpsellOpportunity
} from './customer-success-agent';

// Dynamic Pricing Agent
export { dynamicPricingAgent } from './dynamic-pricing-agent';
export type {
  PricingRecommendation,
  DemandForecast,
  PricingStrategy
} from './dynamic-pricing-agent';

// Instructor Matching Agent
export { instructorMatchingAgent } from './instructor-matching-agent';
export type {
  InstructorProfile,
  StudentProfile,
  MatchRecommendation,
  InstructorExpertise
} from './instructor-matching-agent';

// Tournament Director Agent
export { tournamentDirectorAgent } from './tournament-director-agent';
export type {
  TournamentSetup,
  TournamentSchedule,
  TournamentRules,
  Leaderboard,
  TournamentStats
} from './tournament-director-agent';

// Loyalty & Rewards Agent
export { loyaltyRewardsAgent } from './loyalty-rewards-agent';
export type {
  LoyaltyProfile,
  Badge,
  Achievement,
  Reward,
  Challenge,
  Leaderboard as LoyaltyLeaderboard
} from './loyalty-rewards-agent';

// Review & Reputation Agent
export { reviewReputationAgent } from './review-reputation-agent';
export type {
  ReviewRequest,
  Review,
  ReputationScore,
  NPSResponse
} from './review-reputation-agent';

// Financial Analytics Agent
export { financialAnalyticsAgent } from './financial-analytics-agent';
export type {
  RevenueMetrics,
  MRRMetrics,
  ProfitabilityAnalysis,
  CashFlowForecast,
  RevenueOpportunity,
  FinancialAlert
} from './financial-analytics-agent';

/**
 * Quick Start Example:
 *
 * ```typescript
 * import {
 *   agentCoordinator,
 *   customerSuccessAgent,
 *   loyaltyRewardsAgent
 * } from '@/server/agents';
 *
 * // Get all agent statuses
 * const statuses = agentCoordinator.getAllAgentStatuses();
 * console.log(`Running ${statuses.filter(s => s.status === 'running').length} agents`);
 *
 * // Use specific agent
 * const health = await customerSuccessAgent.calculateHealthScore(userId, facilityId);
 *
 * // Coordinate multi-agent workflow
 * await agentCoordinator.coordinateTask('new_customer_onboarding', {
 *   userId,
 *   facilityId
 * });
 * ```
 */
