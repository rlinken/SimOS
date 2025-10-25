# Role Switching for Testing

## Quick Switch Commands

Copy and paste these SQL commands to switch your role and test different views:

### 🏢 Switch to FACILITY OWNER
```sql
UPDATE users 
SET role = 'facility_admin'
WHERE email = 'adamlinkenauger@gmail.com';
```

After running this, refresh the app. You'll see:
- Owner Dashboard with Settings access
- Bay, Membership, and Staff management
- Booking overview and analytics
- Full facility configuration

---

### 👤 Switch to CUSTOMER
```sql
UPDATE users 
SET role = 'customer'
WHERE email = 'adamlinkenauger@gmail.com';
```

After running this, refresh the app. You'll see:
- Customer Dashboard with booking calendar
- Account management (Profile, Booking History, Security)
- Membership information
- Book bays, lessons, and fittings

---

## Current Setup

**Facility:** Demo Golf Simulator
- **3 Bays:**
  - Bay 1 - Standard
  - Bay 2 - Standard  
  - TrackMan Bay - Premium
  
- **1 Membership Tier:**
  - Gold Membership ($99/month)
  - 10 included bay hours
  - $30/hour member rate

**Your Account:** adamlinkenauger@gmail.com
- Currently set as: **customer**
- Linked to: Demo Golf Simulator

---

## How to Switch

1. Open the **Database** pane (or use the SQL tool in chat)
2. Copy one of the SQL commands above
3. Run the command
4. **Refresh your browser** to see the new view
5. Switch back anytime using the other command

---

## Testing Tips

**As Facility Owner:**
- Configure facility settings (buffer times, pricing)
- Create/edit bays and membership tiers
- View all bookings across the facility
- Manage staff schedules

**As Customer:**  
- Book bays for specific time slots
- View your booking history
- Update your profile and account settings
- See membership tier restrictions

**Note:** In production, these would be completely separate accounts with different Replit logins. This switching method is just for development/testing.
