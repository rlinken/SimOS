import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  GraduationCap, 
  Target, 
  CreditCard, 
  Sparkles,
  Users,
  Repeat,
  UserCheck
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { CustomerProfileDialog } from "@/components/customer-profile-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Order {
  id: string;
  type: "booking" | "lesson" | "fitting" | "transformation_package" | "membership";
  date: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  description: string;
  amount: string;
  paymentStatus: "paid" | "pending" | "cancelled" | "refunded";
  paymentMethod?: string;
  referredBy?: {
    firstName: string;
    lastName: string;
  };
}

interface Analytics {
  dateRange: { start: string; end: string };
  revenueByType: {
    bookings: number;
    lessons: number;
    fittings: number;
    transformationPackages: number;
    memberships: number;
  };
  recurringRevenue: {
    mrr: number;
    activeMemberships: number;
    annualizedRevenue: number;
  };
  revenueByReferrer: Array<{
    id: string;
    name: string;
    revenue: number;
    count: number;
  }>;
  revenueByInstructor: Array<{
    id: string;
    name: string;
    revenue: number;
    count: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  totalRevenue: number;
}

const ORDER_TYPE_CONFIG = {
  booking: { label: "Bay Booking", icon: MapPin, color: "text-blue-600" },
  lesson: { label: "Lesson", icon: GraduationCap, color: "text-purple-600" },
  fitting: { label: "Fitting", icon: Target, color: "text-orange-600" },
  transformation_package: { label: "Package", icon: Sparkles, color: "text-pink-600" },
  membership: { label: "Membership", icon: CreditCard, color: "text-green-600" },
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#f59e0b'];

export default function SalesPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);
  const [dateRange, setDateRange] = useState<string>("month");

  // Calculate date range for analytics query
  const getDateRangeParams = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last-month":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "quarter":
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(getDateRangeParams());
      const response = await fetch(`/api/analytics?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const isLoading = analyticsLoading || ordersLoading;

  // Prepare data for charts
  const productRevenueData = analytics?.revenueByType ? [
    { name: "Bay Bookings", value: analytics.revenueByType?.bookings ?? 0, color: '#3b82f6' },
    { name: "Lessons", value: analytics.revenueByType?.lessons ?? 0, color: '#a855f7' },
    { name: "Fittings", value: analytics.revenueByType?.fittings ?? 0, color: '#f97316' },
    { name: "Packages", value: analytics.revenueByType?.transformationPackages ?? 0, color: '#ec4899' },
    { name: "Memberships", value: analytics.revenueByType?.memberships ?? 0, color: '#22c55e' },
  ].filter(item => item.value > 0) : [];

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
      case "refunded": return "secondary";
      default: return "secondary";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Sales & Revenue Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive revenue reporting and business intelligence
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]" data-testid="select-date-range">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading analytics...</div>
      ) : (
        <>
          {/* Primary KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold" data-testid="stat-total-revenue">
                {formatCurrency(analytics?.totalRevenue ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selected period
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">Monthly Recurring</div>
                <Repeat className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold" data-testid="stat-mrr">
                {formatCurrency(analytics?.recurringRevenue?.mrr ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics?.recurringRevenue?.activeMemberships ?? 0} active memberships
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">Annual Recurring</div>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold" data-testid="stat-arr">
                {formatCurrency(analytics?.recurringRevenue?.annualizedRevenue ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Projected ARR
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">Top Referrer</div>
                <UserCheck className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold" data-testid="stat-top-referrer-revenue">
                {analytics?.revenueByReferrer?.[0]?.revenue 
                  ? formatCurrency(analytics?.revenueByReferrer?.[0]?.revenue ?? 0)
                  : "$0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {analytics?.revenueByReferrer?.[0]?.name || "No referrals"}
              </p>
            </Card>
          </div>

          {/* Revenue by Product/Service */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Revenue by Product/Service</h2>
                <p className="text-sm text-muted-foreground">Breakdown of revenue sources</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Bay Bookings</span>
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(analytics?.revenueByType?.bookings ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Lessons</span>
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(analytics?.revenueByType?.lessons ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Fittings</span>
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(analytics?.revenueByType?.fittings ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-600" />
                    <span className="text-sm font-medium">Packages</span>
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(analytics?.revenueByType?.transformationPackages ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg col-span-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Memberships</span>
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(analytics?.revenueByType?.memberships ?? 0)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Monthly Revenue Trend</h2>
                <p className="text-sm text-muted-foreground">Revenue over the past year</p>
              </div>
              {analytics?.monthlyRevenue && analytics?.monthlyRevenue?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      fontSize={12}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      fontSize={12}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </Card>
          </div>

          {/* Revenue by Referrer & Instructor */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Revenue by Referral</h2>
                <p className="text-sm text-muted-foreground">Top employees driving referrals</p>
              </div>
              {analytics?.revenueByReferrer && analytics?.revenueByReferrer?.length > 0 ? (
                <div className="space-y-3">
                  {analytics?.revenueByReferrer?.slice(0, 5).map((referrer, index) => (
                    <div key={referrer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{referrer.name}</div>
                          <div className="text-xs text-muted-foreground">{referrer.count} referrals</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(referrer.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No referral data available
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Revenue by Instructor</h2>
                <p className="text-sm text-muted-foreground">Top revenue-generating instructors</p>
              </div>
              {analytics?.revenueByInstructor && analytics?.revenueByInstructor?.length > 0 ? (
                <div className="space-y-3">
                  {analytics?.revenueByInstructor?.slice(0, 5).map((instructor, index) => (
                    <div key={instructor.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{instructor.name}</div>
                          <div className="text-xs text-muted-foreground">{instructor.count} lessons</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(instructor.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No instructor revenue data available
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="overflow-hidden">
            <div className="border-b p-4 bg-muted/50">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
            </div>

            {ordersLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground">Orders and revenue will appear here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {[...orders]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 50)
                  .map((order) => {
                    const TypeIcon = ORDER_TYPE_CONFIG[order.type]?.icon || User;
                    return (
                      <div
                        key={order.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`transaction-${order.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                              <TypeIcon className="w-5 h-5 text-primary" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={() => {
                                    setSelectedCustomerId(order.customer.id);
                                    setCustomerProfileOpen(true);
                                  }}
                                  className="font-semibold hover:text-primary transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                                  data-testid={`customer-${order.customer.id}`}
                                >
                                  {order.customer.firstName} {order.customer.lastName}
                                </button>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {ORDER_TYPE_CONFIG[order.type]?.label}
                                </Badge>
                              </div>

                              <div className="text-sm text-muted-foreground mb-1">
                                {order.description}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(order.date), "MMM d, yyyy")}
                                </div>
                                {order.customer.email && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {order.customer.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold mb-1">
                              ${parseFloat(order.amount).toFixed(2)}
                            </div>
                            <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                              {order.paymentStatus}
                            </Badge>
                            {order.paymentMethod && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {order.paymentMethod}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Customer Profile Dialog */}
      <CustomerProfileDialog 
        customerId={selectedCustomerId}
        open={customerProfileOpen}
        onOpenChange={setCustomerProfileOpen}
      />
    </div>
  );
}
