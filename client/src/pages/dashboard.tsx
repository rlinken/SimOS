import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Users,
  TrendingUp,
  MapPin,
  DollarSign,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface DashboardStats {
  totalBookings: number;
  totalMembers: number;
  totalRevenue: number;
  bayUtilization: number;
  todayBookings: number;
  activeMembers: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  const statCards = [
    {
      title: "Total Bookings",
      value: stats?.totalBookings || 0,
      change: "+12%",
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Active Members",
      value: stats?.activeMembers || 0,
      change: "+8%",
      icon: Users,
      color: "text-chart-2",
    },
    {
      title: "Revenue (MTD)",
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      change: "+15%",
      icon: DollarSign,
      color: "text-chart-3",
    },
    {
      title: "Bay Utilization",
      value: `${stats?.bayUtilization || 0}%`,
      change: "+5%",
      icon: MapPin,
      color: "text-chart-4",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="p-6 space-y-3" data-testid={`card-stat-${idx}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </div>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold font-mono">{stat.value}</div>
            <div className="flex items-center gap-1 text-xs text-primary">
              <TrendingUp className="w-3 h-3" />
              <span>{stat.change} from last month</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Link href="/schedule">
          <Card className="p-6 space-y-4 cursor-pointer hover-elevate" data-testid="card-todays-bookings">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Today's Bookings</h3>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {[
                { time: "10:00 AM", bay: "Bay 1", member: "John Doe" },
                { time: "11:30 AM", bay: "Bay 2", member: "Jane Smith" },
                { time: "2:00 PM", bay: "Bay 3", member: "Bob Johnson" },
                { time: "4:00 PM", bay: "Bay 1", member: "Alice Williams" },
              ].map((booking, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  data-testid={`booking-item-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <div className="font-medium">{booking.bay}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.member}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground">
                    {booking.time}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Link>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="grid gap-3">
            <button
              className="p-4 text-left rounded-lg border hover-elevate active-elevate-2"
              data-testid="button-new-booking"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">New Booking</div>
                  <div className="text-sm text-muted-foreground">
                    Schedule a bay rental
                  </div>
                </div>
              </div>
            </button>
            <button
              className="p-4 text-left rounded-lg border hover-elevate active-elevate-2"
              data-testid="button-add-member"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Add Member</div>
                  <div className="text-sm text-muted-foreground">
                    Register new member
                  </div>
                </div>
              </div>
            </button>
            <button
              className="p-4 text-left rounded-lg border hover-elevate active-elevate-2"
              data-testid="button-view-bays"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">View Bays</div>
                  <div className="text-sm text-muted-foreground">
                    Manage bay status
                  </div>
                </div>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
