# GolfSimOS Terminology Guide

## User Types & Roles

### Customer vs Membership Holder

**IMPORTANT DISTINCTION:**

- **Customer** (or **User**): Anyone with an account on the platform
  - Can book bays, lessons, and fittings
  - May or may not have a membership package
  - Pays per-use rates or purchases one-time bookings
  - Role: `customer` (previously `member` - now deprecated)

- **Membership Holder**: A customer who has purchased a membership package
  - Has all customer privileges PLUS membership benefits
  - Gets included bay hours per billing period
  - Receives discounts on lessons, fittings, and products
  - Identified by having a `membershipTierId` assigned

### Role Hierarchy

1. **Owner** - Facility creator (auto-assigned during onboarding)
2. **Administrator** - Full facility management access
3. **Instructor** - Can teach lessons, manage own schedule
4. **Club Fitter** - Can perform fittings, manage own schedule  
5. **Support** - Can assist with bookings and customer service
6. **Customer** - Regular user account (with or without membership package)

### Legacy Note

The role `member` is **deprecated** and should not be used in new code. All references should use `customer` instead. Existing database entries with role `member` are automatically migrated to `customer`.

## Membership System

### Membership Tiers
Membership packages that customers can purchase, offering:
- Included bay hours per billing period (monthly or annual)
- Discounted hourly rates after free hours are used
- Percentage discounts on lessons, fittings, and products
- Access to premium bay tiers

### Non-Members
Non-members can:
- Book without an account (if `requireAccountForBooking` is false)
- Create an account during booking
- Pay the facility's `nonMemberBayRate` per hour

### Pricing Model

**For Bay Rentals:**
1. **Non-members**: Pay `nonMemberBayRate` per hour (facility-wide setting)
2. **Customers without membership**: Pay `nonMemberBayRate` per hour
3. **Membership holders with hours remaining**: FREE (uses membership package hours)
4. **Membership holders with hours exceeded**: Pay `memberBayRate` per hour (discounted rate)

**For Lessons/Fittings/Products:**
1. **Non-members/Customers**: Pay full price
2. **Membership holders**: Pay discounted price based on tier discount percentage

## UI/UX Labels

- **Dashboard name**: "Customer Dashboard" (not "Member Dashboard")
- **User listings**: "Customers" (not "Members")  
- **Membership page**: "Membership Tiers" or "Membership Plans"
- **Signup**: "Create Account" or "Sign Up"
- **Booking prompts**: "Become a member to save!" or "Upgrade membership"

## Database Schema

- `users.role`: Should be `customer` for regular users
- `users.membershipTierId`: NULL for non-membership holders, set for membership holders
- `membershipTiers`: Defines available membership packages
- `membershipUsage`: Tracks hours used per customer per billing period
- `facilities.nonMemberBayRate`: Hourly rate for non-membership holders
- `bookings.usedMembershipHours`: Whether this booking consumed membership package hours

## Code Examples

```typescript
// ✅ CORRECT: Check if user is a membership holder
const isMembershipHolder = user.membershipTierId !== null;

// ✅ CORRECT: Check if user is a customer (regular user account)
const isCustomer = user.role === "customer";

// ❌ INCORRECT: Don't use "member" role
const isMember = user.role === "member"; // DEPRECATED

// ✅ CORRECT: Check membership benefits
if (user.membershipTierId) {
  const tier = await getMembershipTier(user.membershipTierId);
  const discount = tier.lessonDiscountPercent;
}
```

## Summary

- **Customer** = Has an account
- **Membership Holder** = Customer who purchased a membership package
- **Non-member** = No account (can still book if facility allows)
- **Staff** = Owner/Admin/Instructor/Fitter/Support roles

The key insight: Being a "customer" (account holder) is separate from being a "membership holder" (purchased package). All membership holders are customers, but not all customers are membership holders.
