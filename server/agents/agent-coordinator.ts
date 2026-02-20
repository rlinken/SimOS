/**
 * Agent Coordinator
 *
 * Central orchestration service for all golf simulator business agents.
 * Manages agent lifecycle, coordinates inter-agent communication, and provides
 * unified interface for monitoring and controlling agent activities.
 */

import { customerSuccessAgent } from './customer-success-agent';
import { dynamicPricingAgent } from './dynamic-pricing-agent';
import { instructorMatchingAgent } from './instructor-matching-agent';
import { tournamentDirectorAgent } from './tournament-director-agent';
import { loyaltyRewardsAgent } from './loyalty-rewards-agent';
import { reviewReputationAgent } from './review-reputation-agent';
import { financialAnalyticsAgent } from './financial-analytics-agent';

export interface AgentStatus {
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  capabilities: string[];
  metrics?: {
    tasksProcessed: number;
    lastActive: Date;
    errorCount: number;
  };
}

export interface AgentCoordinatorConfig {
  enableAll: boolean;
  enabledAgents: string[];
  autoStart: boolean;
}

class AgentCoordinator {
  private static instance: AgentCoordinator;
  private agents: Map<string, any> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private config: AgentCoordinatorConfig;

  private constructor() {
    this.config = {
      enableAll: true,
      enabledAgents: [
        'customer-success',
        'dynamic-pricing',
        'instructor-matching',
        'tournament-director',
        'loyalty-rewards',
        'review-reputation',
        'financial-analytics'
      ],
      autoStart: true
    };

    this.registerAgents();
    if (this.config.autoStart) {
      this.initializeAgents();
    }
  }

  public static getInstance(): AgentCoordinator {
    if (!AgentCoordinator.instance) {
      AgentCoordinator.instance = new AgentCoordinator();
    }
    return AgentCoordinator.instance;
  }

  /**
   * Register all available agents
   */
  private registerAgents() {
    // Customer Success Agent
    this.agents.set('customer-success', customerSuccessAgent);
    this.agentStatuses.set('customer-success', {
      name: 'Customer Success Agent',
      type: 'retention',
      status: 'running',
      description: 'Monitors customer health, prevents churn, identifies upsell opportunities',
      capabilities: [
        'Customer health scoring',
        'Churn risk prediction',
        'Upsell opportunity identification',
        'Engagement tracking',
        'Automated interventions'
      ]
    });

    // Dynamic Pricing Agent
    this.agents.set('dynamic-pricing', dynamicPricingAgent);
    this.agentStatuses.set('dynamic-pricing', {
      name: 'Dynamic Pricing Agent',
      type: 'revenue_optimization',
      status: 'running',
      description: 'Optimizes pricing based on demand, time, and events',
      capabilities: [
        'Demand forecasting',
        'Real-time price optimization',
        'Surge pricing for peak hours',
        'Promotional pricing suggestions',
        'Revenue impact analysis'
      ]
    });

    // Instructor Matching Agent
    this.agents.set('instructor-matching', instructorMatchingAgent);
    this.agentStatuses.set('instructor-matching', {
      name: 'Instructor Matching Agent',
      type: 'optimization',
      status: 'running',
      description: 'Matches students with optimal instructors',
      capabilities: [
        'Student skill assessment',
        'Instructor profile analysis',
        'Optimal pairing algorithm',
        'Success prediction',
        'Expertise tracking'
      ]
    });

    // Tournament Director Agent
    this.agents.set('tournament-director', tournamentDirectorAgent);
    this.agentStatuses.set('tournament-director', {
      name: 'Tournament Director Agent',
      type: 'automation',
      status: 'running',
      description: 'Automates tournament setup, management, and reporting',
      capabilities: [
        'Tournament setup automation',
        'Optimal pairing generation',
        'Real-time leaderboards',
        'Conflict detection',
        'Post-event analytics'
      ]
    });

    // Loyalty & Rewards Agent
    this.agents.set('loyalty-rewards', loyaltyRewardsAgent);
    this.agentStatuses.set('loyalty-rewards', {
      name: 'Loyalty & Rewards Agent',
      type: 'engagement',
      status: 'running',
      description: 'Gamification, rewards, and customer engagement',
      capabilities: [
        'Points and rewards management',
        'Achievement tracking',
        'Challenge creation',
        'Leaderboards',
        'Milestone celebrations'
      ]
    });

    // Review & Reputation Agent
    this.agents.set('review-reputation', reviewReputationAgent);
    this.agentStatuses.set('review-reputation', {
      name: 'Review & Reputation Agent',
      type: 'reputation',
      status: 'running',
      description: 'Manages reviews, reputation scoring, and feedback',
      capabilities: [
        'Automated review requests',
        'Sentiment analysis',
        'Reputation scoring',
        'NPS tracking',
        'Issue identification'
      ]
    });

    // Financial Analytics Agent
    this.agents.set('financial-analytics', financialAnalyticsAgent);
    this.agentStatuses.set('financial-analytics', {
      name: 'Financial Analytics Agent',
      type: 'analytics',
      status: 'running',
      description: 'Revenue forecasting, profitability analysis, financial insights',
      capabilities: [
        'Revenue forecasting',
        'MRR/ARR tracking',
        'Profitability analysis',
        'Cash flow projection',
        'Opportunity identification'
      ]
    });
  }

  /**
   * Initialize all enabled agents
   */
  private initializeAgents() {
    console.log('🤖 Agent Coordinator: Initializing agents...');

    const enabledAgents = this.config.enableAll
      ? Array.from(this.agents.keys())
      : this.config.enabledAgents;

    enabledAgents.forEach(agentKey => {
      const agent = this.agents.get(agentKey);
      const status = this.agentStatuses.get(agentKey);

      if (agent && status) {
        console.log(`  ✓ ${status.name} initialized`);
        status.status = 'running';
        status.metrics = {
          tasksProcessed: 0,
          lastActive: new Date(),
          errorCount: 0
        };
      }
    });

    console.log(`✅ Agent Coordinator: ${enabledAgents.length} agents running`);
  }

  /**
   * Get status of all agents
   */
  public getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  /**
   * Get specific agent status
   */
  public getAgentStatus(agentKey: string): AgentStatus | null {
    return this.agentStatuses.get(agentKey) || null;
  }

  /**
   * Get agent instance
   */
  public getAgent(agentKey: string): any {
    return this.agents.get(agentKey);
  }

  /**
   * Enable/disable specific agent
   */
  public setAgentEnabled(agentKey: string, enabled: boolean): boolean {
    const status = this.agentStatuses.get(agentKey);
    if (!status) return false;

    status.status = enabled ? 'running' : 'stopped';

    if (enabled && !this.config.enabledAgents.includes(agentKey)) {
      this.config.enabledAgents.push(agentKey);
    } else if (!enabled) {
      this.config.enabledAgents = this.config.enabledAgents.filter(k => k !== agentKey);
    }

    return true;
  }

  /**
   * Get system-wide agent statistics
   */
  public getSystemStats(): {
    totalAgents: number;
    runningAgents: number;
    stoppedAgents: number;
    errorAgents: number;
    agentTypes: Record<string, number>;
  } {
    const statuses = Array.from(this.agentStatuses.values());

    const agentTypes: Record<string, number> = {};
    statuses.forEach(status => {
      agentTypes[status.type] = (agentTypes[status.type] || 0) + 1;
    });

    return {
      totalAgents: statuses.length,
      runningAgents: statuses.filter(s => s.status === 'running').length,
      stoppedAgents: statuses.filter(s => s.status === 'stopped').length,
      errorAgents: statuses.filter(s => s.status === 'error').length,
      agentTypes
    };
  }

  /**
   * Coordinate multi-agent task
   */
  public async coordinateTask(taskType: string, params: any): Promise<any> {
    switch (taskType) {
      case 'new_customer_onboarding':
        return this.handleNewCustomerOnboarding(params);

      case 'post_booking_workflow':
        return this.handlePostBookingWorkflow(params);

      case 'monthly_business_review':
        return this.handleMonthlyBusinessReview(params);

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  /**
   * Handle new customer onboarding workflow (multi-agent)
   */
  private async handleNewCustomerOnboarding(params: {
    userId: number;
    facilityId: number;
  }): Promise<any> {
    console.log(`🤖 Coordinating new customer onboarding for user ${params.userId}`);

    const results: any = {};

    // 1. Award loyalty points for joining
    const loyaltyAgent = this.agents.get('loyalty-rewards');
    results.loyalty = await loyaltyAgent.awardPoints(
      params.userId,
      params.facilityId,
      'referral', // Using referral as "new signup"
      0.5 // Half points for joining
    );

    // 2. Initialize customer success tracking
    const customerSuccessAgent = this.agents.get('customer-success');
    results.healthScore = await customerSuccessAgent.calculateHealthScore(
      params.userId,
      params.facilityId
    );

    // 3. Get instructor recommendation for first lesson
    const instructorAgent = this.agents.get('instructor-matching');
    try {
      results.instructorMatch = await instructorAgent.findBestMatch(
        params.userId,
        params.facilityId
      );
    } catch (error) {
      results.instructorMatch = null; // May not have data yet
    }

    return results;
  }

  /**
   * Handle post-booking workflow (multi-agent)
   */
  private async handlePostBookingWorkflow(params: {
    userId: number;
    facilityId: number;
    bookingId: number;
  }): Promise<any> {
    console.log(`🤖 Coordinating post-booking workflow for booking ${params.bookingId}`);

    const results: any = {};

    // 1. Award loyalty points
    const loyaltyAgent = this.agents.get('loyalty-rewards');
    results.loyalty = await loyaltyAgent.awardPoints(
      params.userId,
      params.facilityId,
      'booking',
      1.0
    );

    // 2. Update customer health score
    const customerSuccessAgent = this.agents.get('customer-success');
    results.healthScore = await customerSuccessAgent.calculateHealthScore(
      params.userId,
      params.facilityId
    );

    // 3. Check for upsell opportunities
    const upsellOpportunities = await customerSuccessAgent.identifyUpsellOpportunities(
      params.facilityId
    );
    results.upsellOpportunities = upsellOpportunities.filter(
      opp => opp.userId === params.userId
    );

    // 4. Schedule review request (handled by review agent automatically)

    return results;
  }

  /**
   * Handle monthly business review (multi-agent)
   */
  private async handleMonthlyBusinessReview(params: {
    facilityId: number;
  }): Promise<any> {
    console.log(`🤖 Generating monthly business review for facility ${params.facilityId}`);

    const results: any = {};

    // 1. Financial metrics
    const financialAgent = this.agents.get('financial-analytics');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    results.revenue = await financialAgent.calculateRevenueMetrics(
      params.facilityId,
      monthStart,
      now
    );
    results.mrr = await financialAgent.calculateMRRMetrics(params.facilityId);
    results.profitability = await financialAgent.analyzeProfitability(params.facilityId);
    results.opportunities = await financialAgent.identifyOpportunities(params.facilityId);

    // 2. Reputation metrics
    const reviewAgent = this.agents.get('review-reputation');
    results.reputation = await reviewAgent.calculateReputationScore(params.facilityId);
    results.satisfactionIssues = await reviewAgent.identifySatisfactionIssues(params.facilityId);

    // 3. Customer success metrics
    const customerSuccessAgent = this.agents.get('customer-success');
    results.churnRisks = await customerSuccessAgent.identifyChurnRisks(params.facilityId);
    results.upsellOpportunities = await customerSuccessAgent.identifyUpsellOpportunities(
      params.facilityId
    );

    // 4. Dynamic pricing insights
    const pricingAgent = this.agents.get('dynamic-pricing');
    results.pricingRecommendations = await pricingAgent.generatePricingRecommendations(
      params.facilityId
    );

    return results;
  }

  /**
   * Shutdown all agents
   */
  public shutdown() {
    console.log('🤖 Agent Coordinator: Shutting down all agents...');

    this.agents.forEach((agent, key) => {
      if (typeof agent.shutdown === 'function') {
        agent.shutdown();
        const status = this.agentStatuses.get(key);
        if (status) {
          status.status = 'stopped';
        }
      }
    });

    console.log('✅ Agent Coordinator: All agents stopped');
  }
}

export const agentCoordinator = AgentCoordinator.getInstance();

// Export convenience functions
export const getAgentStatus = (agentKey: string) => agentCoordinator.getAgentStatus(agentKey);
export const getAllAgentStatuses = () => agentCoordinator.getAllAgentStatuses();
export const getSystemStats = () => agentCoordinator.getSystemStats();
export const coordinateTask = (taskType: string, params: any) =>
  agentCoordinator.coordinateTask(taskType, params);
