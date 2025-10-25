import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, CreditCard, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Booking, MembershipTier } from "@shared/schema";
import { format, addDays, isSameDay, parseISO } from "date-fns";

type EnrichedBooking = Booking & {
  user?: any;
  bay?: any;
};

export default function MemberDashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"all" | "bays" | "lessons" | "fittings">("all");

  const { data: bookings = [] } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: membershipTiers = [] } = useQuery<MembershipTier[]>({
    queryKey: ["/api/membership-tiers"],
  });

  // Filter user's bookings
  const myBookings = bookings.filter((b) => b.userId === user?.id);
  const upcomingBookings = myBookings.filter(
    (b) => new Date(b.startTime) > new Date()
  );
  const pastBookings = myBookings.filter(
    (b) => new Date(b.startTime) <= new Date()
  );

  // Get user's membership tier
  const userMembership = user?.membershipTierId
    ? membershipTiers.find((t) => t.id === user.membershipTierId)
    : null;

  // Get week dates for calendar view - always start with today on the left
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));

  // Filter bookings by view mode
  const filteredBookings = myBookings.filter((booking) => {
    if (viewMode === "all") return true;
    if (viewMode === "bays") return booking.type === "rental";
    if (viewMode === "lessons") return booking.type === "lesson";
    if (viewMode === "fittings") return booking.type === "fitting";
    return true;
  });

  const getBookingColor = (type: string) => {
    switch (type) {
      case "rental":
        return "bg-primary/10 text-primary border-primary/20";
      case "lesson":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "fitting":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "rental":
        return "Bay Rental";
      case "lesson":
        return "Lesson";
      case "fitting":
        return "Club Fitting";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-welcome">
          Welcome back, {user?.firstName || "Member"}!
        </h1>
        <p className="text-muted-foreground">
          Manage your bookings and schedule new activities
        </p>
      </div>

      {/* Membership Card */}
      {userMembership && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">{userMembership.name} Member</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {userMembership.description || "Premium membership benefits"}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Monthly Rate:</span>
                  <span className="ml-2 font-semibold">${userMembership.monthlyPrice}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <span className="ml-2 font-semibold">${userMembership.hourlyRate || "Standard"}</span>
                </div>
                {userMembership.monthlyHours > 0 && (
                  <div>
                    <span className="text-muted-foreground">Monthly Hours:</span>
                    <span className="ml-2 font-semibold">{userMembership.monthlyHours} hrs</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 hover-elevate cursor-pointer" data-testid="card-book-bay">
          <MapPin className="w-8 h-8 mb-3 text-primary" />
          <h3 className="font-semibold mb-1">Book a Bay</h3>
          <p className="text-sm text-muted-foreground">Reserve simulator time</p>
        </Card>
        <Card className="p-6 hover-elevate cursor-pointer" data-testid="card-book-lesson">
          <User className="w-8 h-8 mb-3 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold mb-1">Schedule Lesson</h3>
          <p className="text-sm text-muted-foreground">Book with an instructor</p>
        </Card>
        <Card className="p-6 hover-elevate cursor-pointer" data-testid="card-book-fitting">
          <Clock className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold mb-1">Club Fitting</h3>
          <p className="text-sm text-muted-foreground">Get professionally fitted</p>
        </Card>
      </div>

      {/* Calendar and Bookings */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past" data-testid="tab-past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* View Mode Switcher */}
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="font-semibold">Filter by Type</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "all" ? "default" : "outline"}
                  onClick={() => setViewMode("all")}
                  data-testid="button-view-all"
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "bays" ? "default" : "outline"}
                  onClick={() => setViewMode("bays")}
                  data-testid="button-view-bays"
                >
                  Bay Rentals
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "lessons" ? "default" : "outline"}
                  onClick={() => setViewMode("lessons")}
                  data-testid="button-view-lessons"
                >
                  Lessons
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "fittings" ? "default" : "outline"}
                  onClick={() => setViewMode("fittings")}
                  data-testid="button-view-fittings"
                >
                  Fittings
                </Button>
              </div>
            </div>
          </Card>

          {/* Week View Calendar */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {format(selectedDate, "MMM d")} - {format(addDays(selectedDate, 6), "MMM d, yyyy")}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                  data-testid="button-prev-week"
                >
                  Previous Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  data-testid="button-today"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  data-testid="button-next-week"
                >
                  Next Week
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date) => {
                const dayBookings = filteredBookings.filter((b) =>
                  isSameDay(parseISO(b.startTime as any), date)
                );
                const isToday = isSameDay(date, new Date());

                return (
                  <div
                    key={date.toISOString()}
                    className={`border rounded-lg p-3 min-h-[120px] ${
                      isToday ? "border-primary bg-primary/5" : ""
                    }`}
                    data-testid={`calendar-day-${format(date, "yyyy-MM-dd")}`}
                  >
                    <div className="text-center mb-2">
                      <div className="text-xs text-muted-foreground">
                        {format(date, "EEE")}
                      </div>
                      <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>
                        {format(date, "d")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-xs p-1 rounded border ${getBookingColor(
                            booking.type
                          )}`}
                          data-testid={`booking-${booking.id}`}
                        >
                          <div className="font-medium truncate">
                            {format(parseISO(booking.startTime as any), "h:mm a")}
                          </div>
                          <div className="truncate">{getTypeLabel(booking.type)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Bookings</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your next bay time, lesson, or fitting
              </p>
              <Button data-testid="button-book-now">
                <Plus className="w-4 h-4 mr-2" />
                Book Now
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="p-6" data-testid={`upcoming-booking-${booking.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getBookingColor(booking.type)}>
                          {getTypeLabel(booking.type)}
                        </Badge>
                        <Badge variant="outline">{booking.paymentStatus}</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(parseISO(booking.startTime as any), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(booking.startTime as any), "h:mm a")} -{" "}
                            {format(parseISO(booking.endTime as any), "h:mm a")}
                          </span>
                        </div>
                        {booking.notes && (
                          <p className="text-muted-foreground mt-2">{booking.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {booking.amount && (
                        <div className="text-lg font-semibold">${booking.amount}</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Past Bookings</h3>
              <p className="text-muted-foreground">
                Your booking history will appear here
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastBookings.map((booking) => (
                <Card key={booking.id} className="p-6 opacity-75" data-testid={`past-booking-${booking.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{getTypeLabel(booking.type)}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(parseISO(booking.startTime as any), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(parseISO(booking.startTime as any), "h:mm a")} -{" "}
                            {format(parseISO(booking.endTime as any), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
