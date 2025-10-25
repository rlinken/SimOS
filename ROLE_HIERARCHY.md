# GolfSimOS Role Hierarchy

## Role Structure

The system uses a hierarchical role system for access control:

### 1. **Owner** 🏆
- **Who**: Creator of the facility during onboarding
- **Permissions**: Full administrative control over everything
- **Can**:
  - Manage all settings
  - Add/remove administrators, instructors, club fitters, support staff
  - Assign administrative privileges to any role
  - Create/edit/delete all resources (bays, bookings, offerings, etc.)
  - View all financial data
- **Cannot be**: Assigned to new users (only created during facility setup)

### 2. **Administrator** 👔
- **Who**: Assigned by owner to help manage the facility
- **Permissions**: Nearly full access (owner can delegate specific permissions)
- **Can**:
  - Manage staff (add/edit instructors, fitters, support)
  - Create/edit/delete offerings, bays, bookings
  - View reports and analytics
  - Manage members and memberships
- **Assigned by**: Owner

### 3. **Instructor** 🏌️
- **Who**: Golf instructors who teach lessons
- **Permissions**: Service-focused access
- **Can**:
  - View their own schedule and bookings
  - Create/manage lessons for their students
  - Set their availability hours
  - Connect Google Calendar
  - View assigned offerings
- **Assigned by**: Owner or Administrator

### 4. **Club Fitter** ⚙️
- **Who**: Staff who perform club fittings
- **Permissions**: Service-focused access
- **Can**:
  - View their own schedule and bookings
  - Create/manage fittings
  - Set their availability hours
  - Connect Google Calendar
  - View assigned offerings
- **Assigned by**: Owner or Administrator

### 5. **Support** 💬
- **Who**: Customer support staff
- **Permissions**: Limited support access
- **Can**:
  - View bookings and member information
  - Help customers with basic inquiries
  - Manage basic member profiles
- **Cannot**: Delete or modify financial data, create offerings
- **Assigned by**: Owner or Administrator

### 6. **Member** ⛳
- **Who**: Regular customers
- **Permissions**: Self-service access
- **Can**:
  - Book available time slots
  - View their own bookings and history
  - Manage their profile
  - View available offerings
- **Default role**: Automatically assigned to all customers

### 7. **Super Admin** 🔧
- **Who**: Platform administrators (Replit system access)
- **Permissions**: System-wide access across all facilities
- **Can**: Everything an owner can do, plus manage multiple facilities
- **Note**: Internal role for platform management

## Permission Matrix

| Action | Owner | Admin | Instructor | Club Fitter | Support | Member |
|--------|-------|-------|------------|-------------|---------|--------|
| Create Facility | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Offerings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Bays | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Bookings | ✅ | ✅ | Own Only | Own Only | ✅ | Own Only |
| Set Availability | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Connect Calendar | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Bookings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Members | ✅ | ✅ | ✅ | ✅ | ✅ | Own Only |

## Onboarding Flow

1. **New User Signs Up**
   - User creates account via Replit Auth
   - Redirected to onboarding wizard

2. **Create Business Hub**
   - User completes facility setup (name, subdomain, bays, etc.)
   - System automatically assigns **Owner** role
   - User becomes the facility owner

3. **Owner Adds Team**
   - Navigate to `/staff`
   - Add Administrators for day-to-day management
   - Add Instructors and Club Fitters to provide services
   - Add Support staff for customer service

4. **Delegate Permissions**
   - Owner can assign administrative control to any staff level
   - Flexible permission system adapts to facility needs

## Code References

### Backend Role Checks
```typescript
// Helper functions in server/routes.ts
function isAdmin(role: string): boolean {
  return role === "super_admin" || role === "owner" || role === "administrator";
}

function isStaff(role: string): boolean {
  return role === "instructor" || role === "club_fitter" || role === "owner" || role === "administrator";
}
```

### Frontend Role Display
```typescript
// In client/src/pages/staff.tsx
const getRoleLabel = (role: string) => {
  switch (role) {
    case "owner": return "Owner";
    case "administrator": return "Administrator";
    case "instructor": return "Instructor";
    case "club_fitter": return "Club Fitter";
    case "support": return "Support";
    default: return role;
  }
};
```

### Database Enum
```typescript
// In shared/schema.ts
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "owner",
  "administrator",
  "instructor",
  "club_fitter",
  "support",
  "member",
]);
```

## Security Notes

- **Owner role is protected**: Cannot be assigned through staff management UI
- **Multi-tenant isolation**: All role checks include facility validation
- **Permission inheritance**: Owners have all administrator permissions
- **Granular control**: System supports custom permission delegation (future enhancement)
