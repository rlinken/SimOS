import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Plus,
  User,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { format, startOfDay, addHours, isSameDay, parseISO, isAfter } from "date-fns";
import { useState } from "react";
import type { Booking, Bay } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate] = useState(new Date());

  // Fetch today's bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<(Booking & { bays: Bay[]; user: any })[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  // Fetch bays for schedule view
  const { data: bays = [] } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
    enabled: !!user,
  });

  // Get next 3 upcoming bookings
  const now = new Date();
  const upcomingBookings = bookings
    .filter(b => isAfter(parseISO(b.startTime), now))
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
    .slice(0, 3);

  // Get today's bookings for mini schedule
  const todayBookings = bookings.filter(b => 
    isSameDay(parseISO(b.startTime), selectedDate)
  );

  // Create a simple schedule grid for today (8am - 8pm)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 8pm

  const isBooked = (bayId: string, hour: number) => {
    const hourStart = addHours(startOfDay(selectedDate), hour);
    const hourEnd = addHours(hourStart, 1);
    
    return todayBookings.find(booking => {
      const bookingStart = parseISO(booking.startTime);
      const bookingEnd = parseISO(booking.endTime);
      
      return booking.bays.some(b => b.id === bayId) &&
        bookingStart < hourEnd && bookingEnd > hourStart;
    });
  };

  if (bookingsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}
          </p>
        </div>
        <Link href="/schedule">
          <Button variant="outline" data-testid="button-view-full-schedule">
            <Calendar className="w-4 h-4 mr-2" />
            Full Schedule
          </Button>
        </Link>
      </div>

      {/* Quick Actions - Horizontal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/schedule">
          <button
            className="w-full p-4 text-left rounded-lg border hover-elevate active-elevate-2"
            data-testid="button-new-booking"
          >
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">New Booking</div>
                <div className="text-xs text-muted-foreground">
                  Schedule bay rental
                </div>
              </div>
            </div>
          </button>
        </Link>
        
        <Link href="/fittings">
          <button
            className="w-full p-4 text-left rounded-lg border hover-elevate active-elevate-2"
            data-testid="button-schedule-fitting"
          >
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Schedule Fitting</div>
                <div className="text-xs text-muted-foreground">
                  Book club fitting
                </div>
              </div>
            </div>
          </button>
        </Link>

        <Link href="/members">
          <button
            className="w-full p-4 text-left rounded-lg border hover-elevate active-elevate-2"
            data-testid="button-add-member"
          >
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Manage Members</div>
                <div className="text-xs text-muted-foreground">
                  View and add
                </div>
              </div>
            </div>
          </button>
        </Link>

        <Link href="/bays">
          <button
            className="w-full p-4 text-left rounded-lg border hover-elevate active-elevate-2"
            data-testid="button-view-bays"
          >
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">View Bays</div>
                <div className="text-xs text-muted-foreground">
                  Manage bay status
                </div>
              </div>
            </div>
          </button>
        </Link>
      </div>

      {/* Today's Schedule - Centerpiece */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Today's Schedule</h2>
          <div className="text-sm text-muted-foreground">
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-[120px_repeat(12,1fr)] bg-muted/50 rounded-t-md">
              <div className="p-2 font-medium border-r text-center">
                Bays
              </div>
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="p-2 text-center border-r last:border-r-0 text-xs font-medium"
                >
                  {hour > 12 ? hour - 12 : hour}{hour === 12 ? 'pm' : hour >= 12 ? 'pm' : 'am'}
                </div>
              ))}
            </div>

            {/* Bay Rows */}
            {bays.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No bays configured yet
              </div>
            ) : (
              bays.slice(0, 4).map(bay => (
                <div 
                  key={bay.id} 
                  className="grid grid-cols-[120px_repeat(12,1fr)] border-b last:border-b-0"
                >
                  <div className="p-2 border-r flex items-center justify-center text-sm font-medium bg-card/50">
                    {bay.name}
                  </div>
                  {hours.map(hour => {
                    const booking = isBooked(bay.id, hour);
                    const isAvailable = !booking && bay.status === 'active';

                    return (
                      <div
                        key={hour}
                        className={`
                          p-2 border-r last:border-r-0 min-h-[50px] 
                          flex items-center justify-center text-xs 
                          ${booking 
                            ? 'bg-primary/10' 
                            : isAvailable 
                            ? 'bg-background' 
                            : 'bg-muted/50'
                          }
                        `}
                      >
                        {booking && (
                          <div className="text-center">
                            <User className="w-3 h-3 mx-auto text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Next Bookings - Below Schedule */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Next Bookings</h3>
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        {upcomingBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No upcoming bookings</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                onClick={() => setLocation('/schedule')}
                data-testid={`booking-item-${booking.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {booking.bays.map(b => b.name).join(', ')}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {booking.user?.firstName} {booking.user?.lastName}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-mono">
                    {format(parseISO(booking.startTime), "h:mm a")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(booking.startTime), "MMM d")}
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
