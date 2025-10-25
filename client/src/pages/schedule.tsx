import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfDay, setHours, setMinutes, isSameDay, isWithinInterval } from "date-fns";

type Bay = {
  id: string;
  name: string;
  tier: string;
  status: string;
};

type Booking = {
  id: string;
  bayId: string;
  startTime: string;
  endTime: string;
  type: string;
  userId: string;
  userName?: string;
  amount?: string;
};

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { data: bays = [] } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Filter bookings for selected date
  const dayStart = startOfDay(selectedDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const dayBookings = bookings.filter(booking => {
    const bookingStart = new Date(booking.startTime);
    return isSameDay(bookingStart, selectedDate);
  });

  // Operating hours (6 AM to 11 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6-22 (6 AM to 10 PM)

  // Helper to check if a bay is booked at a specific hour
  const isBooked = (bayId: string, hour: number) => {
    const slotStart = setMinutes(setHours(dayStart, hour), 0);
    const slotEnd = setMinutes(setHours(dayStart, hour), 59);

    return dayBookings.find(booking => {
      if (booking.bayId !== bayId) return false;
      
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      // Check if booking overlaps with this hour slot
      return isWithinInterval(slotStart, { start: bookingStart, end: bookingEnd }) ||
             isWithinInterval(slotEnd, { start: bookingStart, end: bookingEnd }) ||
             (bookingStart <= slotStart && bookingEnd >= slotEnd);
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-amber-500/10 border-amber-500/20';
      case 'vip': return 'bg-purple-500/10 border-purple-500/20';
      default: return 'bg-card border-card-border';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'premium': return 'Premium';
      case 'vip': return 'VIP';
      default: return 'Standard';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bay Schedule</h1>
          <p className="text-muted-foreground">
            Hourly schedule showing all bays and bookings
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            data-testid="button-prev-day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="text-center">
              <div className="text-lg font-semibold">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </div>
              {isSameDay(selectedDate, new Date()) && (
                <div className="text-sm text-primary">Today</div>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            data-testid="button-next-day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Schedule Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header Row */}
            <div className="grid grid-cols-[200px_repeat(17,1fr)] border-b">
              <div className="p-4 font-semibold border-r bg-muted/50">Bay</div>
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="p-2 text-center text-sm font-medium border-r last:border-r-0 bg-muted/50"
                  data-testid={`header-hour-${hour}`}
                >
                  {format(setHours(new Date(), hour), "ha")}
                </div>
              ))}
            </div>

            {/* Bay Rows */}
            {bays.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No bays configured. Add bays in the Bays page to get started.
              </div>
            ) : (
              bays.map(bay => (
                <div 
                  key={bay.id} 
                  className={`grid grid-cols-[200px_repeat(17,1fr)] border-b last:border-b-0 ${getTierColor(bay.tier)}`}
                  data-testid={`bay-row-${bay.id}`}
                >
                  {/* Bay Name Column */}
                  <div className="p-4 border-r flex flex-col gap-1">
                    <div className="font-medium">{bay.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getTierBadge(bay.tier)}
                    </div>
                    {bay.status !== 'active' && (
                      <div className="text-xs text-destructive capitalize">
                        {bay.status}
                      </div>
                    )}
                  </div>

                  {/* Time Slots */}
                  {hours.map(hour => {
                    const booking = isBooked(bay.id, hour);
                    const isAvailable = !booking && bay.status === 'active';

                    return (
                      <div
                        key={hour}
                        className={`p-2 border-r last:border-r-0 min-h-[80px] flex items-center justify-center text-xs transition-colors ${
                          booking 
                            ? 'bg-primary/20 border-primary/30' 
                            : isAvailable 
                            ? 'hover-elevate cursor-pointer' 
                            : 'bg-muted/50'
                        }`}
                        data-testid={`slot-${bay.id}-${hour}`}
                      >
                        {booking ? (
                          <div className="text-center">
                            <div className="font-medium text-primary">Booked</div>
                            {booking.userName && (
                              <div className="text-muted-foreground mt-1">
                                {booking.userName}
                              </div>
                            )}
                            <div className="text-muted-foreground">
                              {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                            </div>
                          </div>
                        ) : isAvailable ? (
                          <div className="text-muted-foreground">Available</div>
                        ) : (
                          <div className="text-muted-foreground">{bay.status}</div>
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

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="font-semibold">Legend:</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-card border"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted/50 border"></div>
            <span>Offline/Maintenance</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
