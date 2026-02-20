# Golf Simulator Business AI Agents

This directory contains a comprehensive suite of AI-powered agents designed to automate and optimize various aspects of running a golf simulator facility. Each agent operates autonomously while being coordinated through the central `agent-coordinator`.

## 🎯 Overview

The Golf Simulator Business platform includes **7 specialized AI agents** that work together to provide a complete business management solution:

| Agent | Type | Purpose | Status |
|-------|------|---------|--------|
| Customer Success | Retention | Prevent churn, drive engagement | ✅ Active |
| Dynamic Pricing | Revenue | Optimize pricing based on demand | ✅ Active |
| Instructor Matching | Optimization | Match students with best-fit instructors | ✅ Active |
| Tournament Director | Automation | Automate event management | ✅ Active |
| Loyalty & Rewards | Engagement | Gamification and rewards | ✅ Active |
| Review & Reputation | Reputation | Manage reviews and feedback | ✅ Active |
| Financial Analytics | Analytics | Revenue forecasting and insights | ✅ Active |

## 🤖 Agent Descriptions

### 1. Customer Success Agent
**File:** `customer-success-agent.ts`

**Mission:** Maximize customer lifetime value through proactive engagement and churn prevention.

**Key Features:**
- **Health Score Calculation** - Comprehensive customer health scoring (0-100) based on:
  - Engagement score (booking frequency, trends)
  - Usage score (membership utilization)
  - Revenue score (total spend)
  - Satisfaction score (inferred from behavior)
- **Churn Risk Detection** - Identifies at-risk customers before they leave
- **Upsell Opportunity Identification** - Finds revenue expansion opportunities:
  - Non-members with high engagement → Membership offers
  - High-usage members → Tier upgrades
  - Active players without lessons → Lesson packages
- **Automated Interventions** - Triggers marketing campaigns for:
  - At-risk customers
  - Inactive users
  - Milestone achievements

**Metrics Tracked:**
- Overall health score per customer
- Risk levels (low/medium/high/critical)
- Engagement trends (improving/stable/declining)
- Churn prediction accuracy

**Processing Schedule:** Every 6 hours

---

### 2. Dynamic Pricing Agent
**File:** `dynamic-pricing-agent.ts`

**Mission:** Maximize revenue through intelligent, demand-based pricing.

**Key Features:**
- **Demand Forecasting** - Predicts booking demand by:
  - Day of week
  - Hour of day
  - Historical patterns
  - Special events
- **Real-Time Pricing** - Adjusts prices based on:
  - Peak hours (weekend evenings +30%)
  - Off-peak discounts (weekday afternoons -25%)
  - Early bird discounts (7+ days advance -15%)
  - Last-minute fills (< 24 hours -20%)
  - Event surge pricing (tournaments +50%)
- **Revenue Impact Analysis** - Projects:
  - Price elasticity effects
  - Booking volume changes
  - Net revenue impact
- **A/B Testing Support** - Tests pricing strategies

**Pricing Strategies:**
```typescript
Peak Hours: Friday/Saturday 5pm-10pm → 1.3x multiplier
Off-Peak: Monday/Tuesday 10am-4pm → 0.75x multiplier
Early Bird: 7-30 days advance → 0.85x multiplier
Last Minute: 0-1 days advance → 0.8x multiplier
Event Surge: Near tournaments → 1.5x multiplier
```

**Processing Schedule:** Daily analysis + real-time pricing

---

### 3. Instructor Matching Agent
**File:** `instructor-matching-agent.ts`

**Mission:** Optimize student-instructor pairings for maximum improvement and satisfaction.

**Key Features:**
- **Student Profiling** - Analyzes:
  - Skill level (beginner/intermediate/advanced/tour)
  - Swing issues (slice, hook, distance loss)
  - Learning style preferences
  - Schedule preferences
  - Lesson history
- **Instructor Profiling** - Tracks:
  - Teaching specialties
  - Skill level expertise
  - Teaching style (technical, pace, communication)
  - Success metrics (improvement %, retention %, rating)
  - Availability and utilization
- **Matching Algorithm** - Scores based on:
  - Skill level compatibility (30 points)
  - Specialty match (25 points)
  - Success metrics (25 points)
  - Availability (10 points)
  - Previous relationship (10 points)
- **Expertise Tracking** - Identifies instructor strengths in:
  - Slice correction
  - Distance improvement
  - Short game
  - Putting
  - Course management

**Match Score Breakdown:**
```
Total Score: 0-100
- 90-100: Perfect match
- 75-89: Excellent match
- 60-74: Good match
- <60: Suboptimal match
```

---

### 4. Tournament Director Agent
**File:** `tournament-director-agent.ts`

**Mission:** Automate tournament setup, execution, and reporting.

**Key Features:**
- **Automated Setup** - Creates:
  - Optimal bay allocation
  - Shotgun start schedules
  - Pairings and groups
  - Prize structures
- **Tournament Formats** - Supports:
  - Stroke play
  - Match play
  - Scramble
  - Best ball
  - Skins game
- **Real-Time Leaderboards** - Tracks:
  - Live scoring
  - Leaderboard positions
  - Statistics (aces, eagles)
  - Pace of play
- **Conflict Detection** - Identifies:
  - Bay availability conflicts
  - Staff scheduling conflicts
  - Overlapping events
- **Post-Event Reports** - Generates:
  - Winner announcements
  - Statistics and highlights
  - Recommendations for future events
  - Financial performance

**Tournament Stats Tracked:**
- Participation (registered, checked-in, no-shows)
- Scoring (avg, low/high rounds, eagles, aces)
- Efficiency (on-time starts, avg round time, utilization)

---

### 5. Loyalty & Rewards Agent
**File:** `loyalty-rewards-agent.ts`

**Mission:** Drive engagement through gamification and rewards.

**Key Features:**
- **Points System** - Awards points for:
  - Bay bookings (10 points)
  - Lessons (25 points)
  - Event participation (50 points)
  - Referrals (100 points)
  - Reviews (15 points)
  - Streak bonuses (5 points/day)
- **Leveling System** - 7 tiers:
  - Level 1: Beginner (0+ points)
  - Level 2: Enthusiast (100+ points)
  - Level 3: Regular (250+ points)
  - Level 4: Dedicated (500+ points)
  - Level 5: Expert (1000+ points)
  - Level 6: Master (2500+ points)
  - Level 7: Legend (5000+ points)
- **Badges & Achievements** - Unlockable rewards:
  - First Timer, Regular, Dedicated Learner
  - Ambassador, Improvement Champion
  - Rarity levels: Common, Rare, Epic, Legendary
- **Challenges** - Daily, weekly, monthly:
  - Daily Player (1 booking today)
  - Weekly Warrior (5 sessions this week)
  - Monthly Improvement (4 lessons this month)
  - Referral Champion (3 referrals)
- **Rewards Catalog** - Redeemable rewards:
  - Discounts (10%, 25% off)
  - Free bay hours
  - Free lessons
  - Merchandise credits
  - VIP upgrades
- **Leaderboards** - Rankings by:
  - Points
  - Bookings
  - Improvement
  - Streak length

---

### 6. Review & Reputation Agent
**File:** `review-reputation-agent.ts`

**Mission:** Build and maintain excellent facility reputation through proactive review management.

**Key Features:**
- **Automated Review Requests** - Optimal timing:
  - Bay rentals: 2 hours after session
  - Lessons: 1 hour after session
  - Events: 4 hours after completion
- **Multi-Platform Support**:
  - Google Reviews
  - Facebook Reviews
  - Yelp
  - Internal feedback
- **Reputation Scoring** - Tracks:
  - Overall rating (1-5 stars)
  - Review distribution
  - Net Promoter Score (NPS)
  - Sentiment analysis (positive/neutral/negative)
  - Topic extraction
- **Sentiment Analysis** - Identifies:
  - Positive, neutral, negative sentiment
  - Topic mentions (staff, cleanliness, equipment, pricing)
  - Emerging issues
- **Response Generation** - AI-suggested responses:
  - Thank you messages for positive reviews
  - Apology and resolution for negative reviews
  - Engagement for neutral reviews
- **Issue Detection** - Alerts on:
  - Rating decline
  - High negative sentiment (>20%)
  - Negative NPS
  - Declining trends

**NPS Categories:**
- Promoters: 9-10 score
- Passives: 7-8 score
- Detractors: 0-6 score
- NPS = (Promoters - Detractors) / Total × 100

**Processing Schedule:** Hourly review opportunity checks

---

### 7. Financial Analytics Agent
**File:** `financial-analytics-agent.ts`

**Mission:** Provide financial intelligence for data-driven business decisions.

**Key Features:**
- **Revenue Metrics** - Comprehensive breakdown:
  - Bay rentals
  - Lessons
  - Memberships
  - Events
  - Products
  - Growth vs. previous period
  - Daily/customer/booking averages
- **MRR/ARR Tracking** - Subscription metrics:
  - Monthly Recurring Revenue
  - Annual Recurring Revenue
  - Active memberships
  - New/churned memberships
  - Churn rate
  - Growth rate
  - Lifetime Value (LTV)
  - Customer Acquisition Cost (CAC)
- **Profitability Analysis** - Service line margins:
  - Revenue by service
  - Cost estimation
  - Profit margins
  - Volume and avg ticket
  - Recommendations
- **Cash Flow Forecasting** - 30-day projections:
  - Daily revenue projections
  - Expense estimates
  - Net cash flow
  - Risk level assessment
  - Confidence intervals
- **Opportunity Identification** - Revenue optimization:
  - Membership growth opportunities
  - Lesson upselling potential
  - Dynamic pricing implementation
  - Event expansion
- **Financial Alerts** - Monitors:
  - Revenue decline (>15% drop)
  - High churn rate (>5%)
  - Low cash flow
  - Unusual patterns

**Key Metrics:**
```
MRR: Monthly recurring revenue from memberships
ARR: Annual recurring revenue (MRR × 12)
Churn Rate: % of members who cancel
LTV: Lifetime value per member
CAC: Cost to acquire a customer
LTV:CAC Ratio: Should be > 3:1
```

**Processing Schedule:** Daily analysis + on-demand queries

---

## 🔧 Agent Coordinator

**File:** `agent-coordinator.ts`

The Agent Coordinator serves as the central orchestration hub for all agents.

**Responsibilities:**
- Agent lifecycle management (start/stop/monitor)
- Inter-agent communication and coordination
- Multi-agent workflow orchestration
- System-wide monitoring and statistics
- Configuration management

**Multi-Agent Workflows:**

### 1. New Customer Onboarding
```typescript
coordinateTask('new_customer_onboarding', { userId, facilityId })
```
**Flow:**
1. Loyalty Agent: Award signup bonus points
2. Customer Success Agent: Initialize health tracking
3. Instructor Matching Agent: Recommend first instructor

### 2. Post-Booking Workflow
```typescript
coordinateTask('post_booking_workflow', { userId, facilityId, bookingId })
```
**Flow:**
1. Loyalty Agent: Award booking points
2. Customer Success Agent: Update health score
3. Customer Success Agent: Check upsell opportunities
4. Review Agent: Schedule review request (auto)

### 3. Monthly Business Review
```typescript
coordinateTask('monthly_business_review', { facilityId })
```
**Flow:**
1. Financial Agent: Revenue metrics, MRR, profitability
2. Review Agent: Reputation score, satisfaction issues
3. Customer Success Agent: Churn risks, upsell opportunities
4. Pricing Agent: Pricing recommendations

**API Usage:**
```typescript
import { agentCoordinator } from './agent-coordinator';

// Get all agent statuses
const statuses = agentCoordinator.getAllAgentStatuses();

// Get specific agent
const pricingAgent = agentCoordinator.getAgent('dynamic-pricing');

// Enable/disable agent
agentCoordinator.setAgentEnabled('loyalty-rewards', true);

// Get system stats
const stats = agentCoordinator.getSystemStats();
// Returns: { totalAgents, runningAgents, stoppedAgents, errorAgents, agentTypes }

// Coordinate multi-agent task
const result = await agentCoordinator.coordinateTask('new_customer_onboarding', {
  userId: 123,
  facilityId: 1
});
```

---

## 🚀 Usage Examples

### Customer Success Agent
```typescript
import { customerSuccessAgent } from './agents/customer-success-agent';

// Calculate customer health
const health = await customerSuccessAgent.calculateHealthScore(userId, facilityId);
console.log(`Health: ${health.overallScore}/100, Risk: ${health.riskLevel}`);

// Identify churn risks
const risks = await customerSuccessAgent.identifyChurnRisks(facilityId);
risks.forEach(risk => {
  console.log(`User ${risk.userId}: ${risk.priority} priority - ${risk.reasons.join(', ')}`);
});

// Find upsell opportunities
const opportunities = await customerSuccessAgent.identifyUpsellOpportunities(facilityId);
```

### Dynamic Pricing Agent
```typescript
import { dynamicPricingAgent } from './agents/dynamic-pricing-agent';

// Forecast demand
const demand = await dynamicPricingAgent.forecastDemand(facilityId, 6, 18); // Saturday 6pm
console.log(`Demand Score: ${demand.demandScore}/100`);

// Get real-time price
const { price, appliedStrategy } = await dynamicPricingAgent.getRealTimePrice(
  offerId,
  requestedTime,
  daysInAdvance
);

// Generate pricing recommendations
const recommendations = await dynamicPricingAgent.generatePricingRecommendations(facilityId);
```

### Instructor Matching Agent
```typescript
import { instructorMatchingAgent } from './agents/instructor-matching-agent';

// Find best instructor match
const match = await instructorMatchingAgent.findBestMatch(userId, facilityId);
console.log(`Best match: Instructor ${match.instructorId} (${match.matchScore}/100)`);
console.log(`Reasoning: ${match.reasoning.join(', ')}`);

// Build instructor profile
const profile = await instructorMatchingAgent.buildInstructorProfile(instructorId, facilityId);
```

### Tournament Director Agent
```typescript
import { tournamentDirectorAgent } from './agents/tournament-director-agent';

// Create tournament
const setup = await tournamentDirectorAgent.createTournamentSetup(
  eventId,
  facilityId,
  48, // participants
  'scramble',
  new Date('2024-06-15T08:00:00'),
  8 // duration hours
);

// Calculate leaderboard
const leaderboard = await tournamentDirectorAgent.calculateLeaderboard(eventId);

// Generate report
const report = await tournamentDirectorAgent.generateTournamentReport(eventId);
```

### Loyalty & Rewards Agent
```typescript
import { loyaltyRewardsAgent } from './agents/loyalty-rewards-agent';

// Get loyalty profile
const profile = await loyaltyRewardsAgent.getLoyaltyProfile(userId, facilityId);
console.log(`Level ${profile.level}: ${profile.levelName} (${profile.points} points)`);

// Award points
const result = await loyaltyRewardsAgent.awardPoints(userId, facilityId, 'lesson', 1.0);
if (result.levelUp) {
  console.log('🎉 Level up!');
}

// Get rewards catalog
const rewards = await loyaltyRewardsAgent.getRewardsCatalog(facilityId, profile.level);

// Redeem reward
const redemption = await loyaltyRewardsAgent.redeemReward(userId, facilityId, 'free-hour');
```

### Review & Reputation Agent
```typescript
import { reviewReputationAgent } from './agents/review-reputation-agent';

// Calculate reputation score
const score = await reviewReputationAgent.calculateReputationScore(facilityId);
console.log(`Rating: ${score.overallRating}/5 (${score.totalReviews} reviews)`);
console.log(`NPS: ${score.nps}`);

// Send review request
await reviewReputationAgent.sendReviewRequest(userId, facilityId, 'facility', bookingId);

// Identify issues
const issues = await reviewReputationAgent.identifySatisfactionIssues(facilityId);
```

### Financial Analytics Agent
```typescript
import { financialAnalyticsAgent } from './agents/financial-analytics-agent';

// Get revenue metrics
const revenue = await financialAnalyticsAgent.calculateRevenueMetrics(
  facilityId,
  monthStart,
  monthEnd
);
console.log(`Total Revenue: $${revenue.totalRevenue}`);
console.log(`Growth: ${revenue.growth.percentChange}%`);

// Get MRR metrics
const mrr = await financialAnalyticsAgent.calculateMRRMetrics(facilityId);
console.log(`MRR: $${mrr.mrr}, ARR: $${mrr.arr}`);
console.log(`Churn Rate: ${mrr.churnRate}%`);

// Forecast cash flow
const forecast = await financialAnalyticsAgent.forecastCashFlow(facilityId, 30);

// Identify opportunities
const opportunities = await financialAnalyticsAgent.identifyOpportunities(facilityId);
```

---

## 📊 Integration with Existing Systems

### Marketing Engine Integration
All agents can trigger marketing events:

```typescript
await marketingEngine.emitEvent({
  eventType: 'inactivity_detected',
  facilityId,
  userId,
  eventData: { daysSinceLastVisit: 30, riskLevel: 'high' },
  timestamp: new Date()
});
```

**Supported Event Types:**
- `inactivity_detected` - Customer Success Agent
- `milestone_achieved` - Loyalty & Rewards Agent
- `booking_created` - Review & Reputation Agent
- Custom events from any agent

### Database Integration
Agents use Drizzle ORM for type-safe database access:

```typescript
import { db } from "@db";
import { users, bookings, lessons } from "@db/schema";

const bookings = await db
  .select()
  .from(bookings)
  .where(eq(bookings.facilityId, facilityId));
```

### Event Bus Pattern
Agents follow event-driven architecture:
- Emit events for significant actions
- Listen to relevant business events
- Coordinate through Agent Coordinator

---

## 🎯 Future Agent Roadmap

### Planned Agents (Not Yet Implemented)

1. **Booking Optimization Agent** - AI-driven bay allocation
2. **League Management Agent** - Automated league scheduling and scoring
3. **Equipment Maintenance Agent** - Predictive maintenance scheduling
4. **Corporate Sales Agent** - B2B account management
5. **Customer Support Agent** - AI chatbot for common questions
6. **Coaching Curriculum Agent** - Personalized lesson plans
7. **Waitlist Management Agent** - Peak time waitlist optimization
8. **Social Media Agent** - Auto-posting achievements and events
9. **Inventory Management Agent** - Stock tracking and reordering
10. **Weather Impact Agent** - Demand prediction based on weather

---

## 📈 Performance Metrics

### Agent Processing Schedules

| Agent | Frequency | Resource Usage |
|-------|-----------|----------------|
| Customer Success | Every 6 hours | Medium |
| Dynamic Pricing | Daily + Real-time | Low |
| Instructor Matching | On-demand | Low |
| Tournament Director | On-demand | Medium |
| Loyalty & Rewards | Real-time | Low |
| Review & Reputation | Hourly | Low |
| Financial Analytics | Daily | Medium |

### Caching Strategy
Agents implement intelligent caching:
- **Customer Success**: 1-hour cache for health scores
- **Dynamic Pricing**: Session-based demand forecast cache
- **Instructor Matching**: 1-hour cache for profiles
- **Review & Reputation**: No cache (real-time)
- **Financial Analytics**: No cache (always fresh)

---

## 🔒 Security & Privacy

### Data Access
- Agents respect facility-based multi-tenancy
- All queries include `facilityId` filter
- No cross-facility data access

### Sensitive Data
- Financial data access logged
- PII handled per privacy policy
- Encryption for sensitive metrics

### Rate Limiting
- Agents self-throttle to prevent database overload
- Batch processing for large operations
- Queue-based processing for scalability

---

## 🛠️ Development

### Adding a New Agent

1. **Create Agent File**
```typescript
// server/agents/my-new-agent.ts
class MyNewAgent {
  private static instance: MyNewAgent;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): MyNewAgent {
    if (!MyNewAgent.instance) {
      MyNewAgent.instance = new MyNewAgent();
    }
    return MyNewAgent.instance;
  }

  private async initialize() {
    console.log('🤖 My New Agent initializing...');
  }

  public async doSomething() {
    // Implementation
  }

  public shutdown() {
    // Cleanup
  }
}

export const myNewAgent = MyNewAgent.getInstance();
```

2. **Register in Agent Coordinator**
```typescript
// In agent-coordinator.ts
import { myNewAgent } from './my-new-agent';

// In registerAgents()
this.agents.set('my-new-agent', myNewAgent);
this.agentStatuses.set('my-new-agent', {
  name: 'My New Agent',
  type: 'category',
  status: 'running',
  description: 'What it does',
  capabilities: ['Feature 1', 'Feature 2']
});
```

3. **Add to Documentation**
Update this README with agent details.

### Testing Agents

```typescript
// test/agents/customer-success-agent.test.ts
import { customerSuccessAgent } from '@/server/agents/customer-success-agent';

describe('Customer Success Agent', () => {
  it('should calculate health score', async () => {
    const score = await customerSuccessAgent.calculateHealthScore(1, 1);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
  });
});
```

---

## 📚 References

- **Singleton Pattern**: All agents use singleton for resource efficiency
- **Event-Driven Architecture**: Agents emit and respond to business events
- **Async Processing**: Non-blocking operations with async/await
- **Type Safety**: Full TypeScript typing for all interfaces
- **Database Layer**: Drizzle ORM for type-safe queries

---

## 🤝 Contributing

To contribute a new agent or enhance an existing one:

1. Follow the singleton pattern
2. Include comprehensive TypeScript types
3. Add error handling and logging
4. Write tests for core functionality
5. Update this documentation
6. Consider caching strategy
7. Implement graceful shutdown

---

## 📞 Support

For questions about the agent system:
- See individual agent files for implementation details
- Check `agent-coordinator.ts` for orchestration
- Review existing agents for patterns and best practices

---

**Last Updated:** 2024
**Agent Count:** 7 active, 10+ planned
**Total Lines of Code:** ~5,000+ (agents only)
