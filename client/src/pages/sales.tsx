import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, User, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

type Booking = {
  id: string;
  bayId: string;
  startTime: string;
  endTime: string;
  type: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount?: string;
  paymentStatus?: string;
  usedMembershipHours?: boolean;
  createdAt: string;
};

type Bay = {
  id: string;
  name: string;
  tier: string;
};

export default function SalesPage() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: bays = [] } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  // Calculate revenue stats
  const paidBookings = bookings.filter(b => b.paymentStatus === "paid" && b.amount);
  const totalRevenue = paidBookings.reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0);
  const pendingRevenue = bookings
    .filter(b => b.paymentStatus === "pending" && b.amount)
    .reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0);
  
  const revenueByType = {
    rental: paidBookings
      .filter(b => b.type === "rental")
      .reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0),
    lesson: paidBookings
      .filter(b => b.type === "lesson")
      .reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0),
    fitting: paidBookings
      .filter(b => b.type === "fitting")
      .reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0),
  };

  const getBayName = (bayId: string) => {
    const bay = bays.find(b => b.id === bayId);
    return bay?.name || "Unknown Bay";
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
            {paidBookings.length} paid bookings
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Pending Revenue</div>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${pendingRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {bookings.filter(b => b.paymentStatus === "pending").length} pending payments
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Bay Rentals</div>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">${revenueByType.rental.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {bookings.filter(b => b.type === "rental" && b.paymentStatus === "paid").length} rentals
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Lessons & Fittings</div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">
            ${(revenueByType.lesson + revenueByType.fitting).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {bookings.filter(b => (b.type === "lesson" || b.type === "fitting") && b.paymentStatus === "paid").length} sessions
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
        ) : bookings.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
            <p className="text-muted-foreground">Bookings and revenue will appear here.</p>
          </div>
        ) : (
          <div className="divide-y">
            {[...bookings]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 50)
              .map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`transaction-${booking.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                        {booking.type === "rental" ? (
                          <MapPin className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {booking.userName || "Guest"}
                          </span>
                          <Badge variant="outline" className="capitalize text-xs">
                            {booking.type}
                          </Badge>
                          {booking.usedMembershipHours && (
                            <Badge variant="secondary" className="text-xs">
                              Membership
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getBayName(booking.bayId)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(booking.startTime), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(booking.startTime), "h:mm a")} - 
                            {format(new Date(booking.endTime), "h:mm a")}
                          </div>
                        </div>

                        {booking.userEmail && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {booking.userEmail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {booking.amount && (
                        <div className="text-lg font-bold mb-1">
                          ${parseFloat(booking.amount).toFixed(2)}
                        </div>
                      )}
                      <Badge variant={getPaymentStatusColor(booking.paymentStatus)}>
                        {booking.paymentStatus || "pending"}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(booking.createdAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
