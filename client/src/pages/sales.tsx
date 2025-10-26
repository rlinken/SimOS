import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, User, MapPin, Clock, GraduationCap, Target, CreditCard, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { CustomerProfileDialog } from "@/components/customer-profile-dialog";

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

const ORDER_TYPE_CONFIG = {
  booking: { label: "Bay Booking", icon: MapPin, color: "text-blue-600" },
  lesson: { label: "Lesson", icon: GraduationCap, color: "text-purple-600" },
  fitting: { label: "Fitting", icon: Target, color: "text-orange-600" },
  transformation_package: { label: "Package", icon: Sparkles, color: "text-pink-600" },
  membership: { label: "Membership", icon: CreditCard, color: "text-green-600" },
};

export default function SalesPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Calculate revenue stats
  const paidOrders = orders.filter(o => o.paymentStatus === "paid" && o.amount);
  const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0);
  const pendingRevenue = orders
    .filter(o => o.paymentStatus === "pending" && o.amount)
    .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0);
  
  const revenueByType = {
    booking: paidOrders
      .filter(o => o.type === "booking")
      .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0),
    lesson: paidOrders
      .filter(o => o.type === "lesson")
      .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0),
    fitting: paidOrders
      .filter(o => o.type === "fitting")
      .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0),
    transformation_package: paidOrders
      .filter(o => o.type === "transformation_package")
      .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0),
    membership: paidOrders
      .filter(o => o.type === "membership")
      .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0),
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
      case "refunded": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales & Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Track bookings, revenue, and financial performance
          </p>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {paidOrders.length} paid orders
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Pending Revenue</div>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${pendingRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.filter(o => o.paymentStatus === "pending").length} pending payments
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Bay Bookings</div>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${revenueByType.booking.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.filter(o => o.type === "booking" && o.paymentStatus === "paid").length} bookings
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Services & Packages</div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">
            ${(revenueByType.lesson + revenueByType.fitting + revenueByType.transformation_package + revenueByType.membership).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.filter(o => ["lesson", "fitting", "transformation_package", "membership"].includes(o.type) && o.paymentStatus === "paid").length} services
          </p>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="overflow-hidden">
        <div className="border-b p-4 bg-muted/50">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>

        {isLoading ? (
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

      {/* Customer Profile Dialog */}
      <CustomerProfileDialog 
        customerId={selectedCustomerId}
        open={customerProfileOpen}
        onOpenChange={setCustomerProfileOpen}
      />
    </div>
  );
}
