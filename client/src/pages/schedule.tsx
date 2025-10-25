import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Mail, Phone, Plus, X, Check, ChevronsUpDown, CalendarDays, CalendarRange, CalendarClock, DollarSign, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, setHours, setMinutes, isSameDay, isWithinInterval, eachDayOfInterval, addWeeks, addMonths } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type Bay = {
  id: string;
  name: string;
  tier: string;
  status: string;
};

type Booking = {
  id: string;
  bayIds: string[];
  startTime: string;
  endTime: string;
  type: string;
  userId: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  amount?: string;
  paymentStatus?: string;
  paymentMethod?: "pay_at_desk" | "new_card" | "card_on_file" | "membership";
  checkInStatus?: "pending" | "checked_in" | "no_show";
  checkedInAt?: string;
  bays?: Array<{ id: string; name: string }>;
};

type ViewMode = 'day' | 'week' | 'month';

// Layout constants for schedule grid
const BAY_COLUMN_WIDTH = 80; // Width of the bay name column in pixels
const HOUR_COLUMN_WIDTH = 150; // Width of each hour column in pixels

export default function Schedule() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  
  // Get view and date from URL params or use defaults
  const urlView = searchParams.get('view') as ViewMode || 'day';
  const urlDate = searchParams.get('date');
  
  const [view, setView] = useState<ViewMode>(urlView);
  const [selectedDate, setSelectedDate] = useState(urlDate ? new Date(urlDate) : new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ bay: Bay; hour: number } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  const scheduleRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Update URL when view or date changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', view);
    params.set('date', format(selectedDate, 'yyyy-MM-dd'));
    setLocation(`/schedule?${params.toString()}`, { replace: true });
  }, [view, selectedDate]);
  
  const { data: bays = [] } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  // Calculate date range based on view
  const getDateRange = () => {
    if (view === 'day') {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      };
    } else if (view === 'week') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      };
    } else {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      };
    }
  };

  const dateRange = getDateRange();

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() }],
    queryFn: async () => {
      const url = `/api/bookings?start=${encodeURIComponent(dateRange.start.toISOString())}&end=${encodeURIComponent(dateRange.end.toISOString())}`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
  });

  // Filter bookings for selected date
  const dayStart = startOfDay(selectedDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const dayBookings = bookings.filter(booking => {
    const bookingStart = new Date(booking.startTime);
    return isSameDay(bookingStart, selectedDate);
  });

  // Operating hours (6 AM to 10 PM) - render all hours for scrolling
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Helper to check if a bay is booked at a specific hour
  const isBooked = (bayId: string, hour: number) => {
    const slotStart = setMinutes(setHours(dayStart, hour), 0);
    const slotEnd = setMinutes(setHours(dayStart, hour + 1), 0);

    return dayBookings.find(booking => {
      if (!booking.bayIds?.includes(bayId)) return false;
      
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      // Booking overlaps with this hour if it starts before the hour ends AND ends after the hour starts
      // Use < for bookingEnd comparison to exclude bookings that end exactly at the hour start
      return bookingStart < slotEnd && bookingEnd > slotStart;
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'border-l-4 border-l-amber-500';
      case 'vip': return 'border-l-4 border-l-purple-500';
      default: return 'border-l-4 border-l-green-500';
    }
  };

  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "outline" => {
    return tier === 'standard' ? 'secondary' : 'default';
  };

  // Check if a time slot is in the past
  const isPastHour = (hour: number) => {
    if (!isSameDay(selectedDate, new Date())) {
      return false; // Don't disable if viewing different date
    }
    const currentHour = new Date().getHours();
    return hour < currentHour;
  };

  const handleSlotClick = (bay: Bay, hour: number) => {
    if (isPastHour(hour)) {
      return; // Prevent booking past slots
    }
    const booking = isBooked(bay.id, hour);
    if (booking) {
      setSelectedBooking(booking);
    } else if (bay.status === 'active') {
      setSelectedSlot({ bay, hour });
    }
  };

  // Navigation handlers for different views
  const handlePrevious = () => {
    if (view === 'day') {
      setSelectedDate(addDays(selectedDate, -1));
    } else if (view === 'week') {
      setSelectedDate(addWeeks(selectedDate, -1));
    } else {
      setSelectedDate(addMonths(selectedDate, -1));
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (view === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const getDisplayText = () => {
    if (view === 'day') {
      return {
        main: format(selectedDate, "EEEE"),
        sub: format(selectedDate, "MMMM d, yyyy"),
      };
    } else if (view === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return {
        main: "Week View",
        sub: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`,
      };
    } else {
      return {
        main: format(selectedDate, "MMMM yyyy"),
        sub: "Month View",
      };
    }
  };

  const displayText = getDisplayText();

  // Function to switch to day view when clicking a specific date
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  // Calculate current time position for indicator  
  const getCurrentTimePosition = () => {
    const now = new Date();
    if (!isSameDay(selectedDate, now)) return null;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    // Only show indicator during operating hours
    if (currentHour < 6 || currentHour >= 23) return null;
    
    // Calculate total minutes since start of operating hours (6 AM)
    const firstHour = 6;
    const minutesSinceStart = ((currentHour - firstHour) * 60) + currentMinute + (currentSeconds / 60);
    const minutesPerColumn = 60; // Each column represents 60 minutes
    
    // Calculate pixel position: start after bay column, then add pixels for elapsed time
    const pixelPosition = BAY_COLUMN_WIDTH + ((minutesSinceStart / minutesPerColumn) * HOUR_COLUMN_WIDTH);
    
    console.log('🔴 TIME INDICATOR DEBUG:', {
      rawTime: now.toLocaleString(),
      currentHour,
      currentMinute,
      currentSeconds,
      firstHour,
      minutesSinceStart: minutesSinceStart.toFixed(2),
      minutesPerColumn,
      BAY_COLUMN_WIDTH,
      HOUR_COLUMN_WIDTH,
      calculation: `${BAY_COLUMN_WIDTH} + ((${minutesSinceStart.toFixed(2)} / ${minutesPerColumn}) * ${HOUR_COLUMN_WIDTH})`,
      pixelPosition: pixelPosition.toFixed(2),
      expectedHourColumn: Math.floor(minutesSinceStart / 60) + firstHour
    });
    
    return { pixelPosition, hour: currentHour, minute: currentMinute, now };
  };

  const timePosition = getCurrentTimePosition();

  // Auto-scroll to current time on mount for day view
  useEffect(() => {
    if (view === 'day' && isSameDay(selectedDate, new Date()) && scheduleRef.current) {
      const timer = setTimeout(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const hourIndex = currentHour - 6; // 6 AM is index 0
        const scrollPosition = hourIndex * HOUR_COLUMN_WIDTH - 300; // Scroll to show current hour with some context before it
        scheduleRef.current?.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, selectedDate]);

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bay Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Click any slot to book or view details
          </p>
        </div>

        {/* View Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="day" data-testid="view-day">
              <CalendarClock className="w-4 h-4 mr-2" />
              Day
            </TabsTrigger>
            <TabsTrigger value="week" data-testid="view-week">
              <CalendarDays className="w-4 h-4 mr-2" />
              Week
            </TabsTrigger>
            <TabsTrigger value="month" data-testid="view-month">
              <CalendarRange className="w-4 h-4 mr-2" />
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Date Navigation */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="p-3 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="rounded-full"
              data-testid="button-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3 flex-1 justify-center">
              <div className="flex items-baseline gap-2">
                <div className="text-lg font-semibold">
                  {displayText.main}
                </div>
                <div className="text-sm text-muted-foreground">
                  {displayText.sub}
                </div>
                {view === 'day' && isSameDay(selectedDate, new Date()) && (
                  <Badge variant="default" className="text-[10px]">Today</Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="rounded-full"
              data-testid="button-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Conditional View Rendering */}
      {view === 'day' && (
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="overflow-x-auto max-w-full" ref={scheduleRef}>
            <div className="inline-block min-w-full relative">
              {/* Header Row */}
              <div 
                className="grid bg-gradient-to-br from-muted/80 to-muted/40 sticky top-0 z-10 backdrop-blur-sm"
                style={{ gridTemplateColumns: `${BAY_COLUMN_WIDTH}px repeat(${hours.length}, ${HOUR_COLUMN_WIDTH}px)` }}
              >
                <div className="p-3 font-semibold border-r border-b flex items-center justify-center sticky left-0 z-20 bg-gradient-to-br from-muted/80 to-muted/40">
                  <span className="text-xs">Bays</span>
                </div>
                {hours.map(hour => {
                  const showAmPm = hour === 6 || hour === 12 || hour === 18;
                  return (
                    <div 
                      key={hour} 
                      className="p-2 text-center border-r last:border-r-0 border-b flex flex-col items-center justify-center"
                      data-testid={`header-hour-${hour}`}
                    >
                      <div className="text-sm font-semibold">{hour > 12 ? hour - 12 : hour}</div>
                      {showAmPm && (
                        <div className="text-[9px] text-muted-foreground uppercase font-medium">{hour < 12 ? 'am' : 'pm'}</div>
                      )}
                    </div>
                  );
                })}
              </div>

            {/* Bay Rows */}
            {bays.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Bays Configured</h3>
                <p className="text-muted-foreground">Add bays in the Bays page to get started.</p>
              </div>
            ) : (
              bays.map(bay => (
                <div 
                  key={bay.id} 
                  className={`grid border-b last:border-b-0 transition-all ${getTierColor(bay.tier)}`}
                  style={{ gridTemplateColumns: `${BAY_COLUMN_WIDTH}px repeat(${hours.length}, ${HOUR_COLUMN_WIDTH}px)` }}
                  data-testid={`bay-row-${bay.id}`}
                >
                  {/* Bay Name Column */}
                  <div className="p-2 border-r flex items-center justify-center bg-muted/30 sticky left-0 z-10">
                    <div className="font-semibold text-xs text-center leading-tight">{bay.name}</div>
                  </div>

                  {/* Time Slots */}
                  {hours.map(hour => {
                    const booking = isBooked(bay.id, hour);
                    const isPast = isPastHour(hour);
                    const isAvailable = !booking && bay.status === 'active' && !isPast;

                    return (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(bay, hour)}
                        className={`
                          p-2 border-r last:border-r-0 min-h-[60px] 
                          flex flex-col items-center justify-center text-xs 
                          transition-all relative group
                          ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                          ${booking 
                            ? 'bg-primary/10 hover:bg-primary/20' 
                            : isAvailable 
                            ? 'bg-background hover:bg-green-50 dark:hover:bg-green-950/20' 
                            : 'bg-muted/50 cursor-not-allowed'
                          }
                        `}
                        data-testid={`slot-${bay.id}-${hour}`}
                      >
                        {booking ? (
                          <div className="text-center space-y-1">
                            <div className="w-8 h-8 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-2">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="font-semibold text-foreground">
                              {booking.user?.firstName} {booking.user?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(booking.startTime), "h:mm")} - {format(new Date(booking.endTime), "h:mm a")}
                            </div>
                            {booking.paymentMethod === 'pay_at_desk' && booking.paymentStatus !== 'paid' && (
                              <Badge variant="default" className="text-[9px] bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                PAY AT DESK
                              </Badge>
                            )}
                            {booking.checkInStatus === 'pending' && (
                              <Badge variant="secondary" className="text-[9px]">
                                Not checked in
                              </Badge>
                            )}
                            {booking.checkInStatus === 'checked_in' && (
                              <Badge variant="default" className="text-[9px] bg-green-600 hover:bg-green-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Checked In
                              </Badge>
                            )}
                            {booking.checkInStatus === 'no_show' && (
                              <Badge variant="default" className="text-[9px] bg-red-600 hover:bg-red-700 flex items-center gap-1">
                                <X className="w-3 h-3" />
                                No Show
                              </Badge>
                            )}
                            <div className={`absolute inset-0 border-2 rounded transition-colors pointer-events-none ${
                              booking.paymentStatus === 'pending' 
                                ? 'border-amber-500 group-hover:border-amber-600' 
                                : 'border-transparent group-hover:border-primary/50'
                            }`} />
                          </div>
                        ) : isAvailable ? (
                          <div className="text-center space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">Book</div>
                          </div>
                        ) : !isPast ? (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground capitalize">{bay.status}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {/* Current Time Indicator */}
            {timePosition && (
              <div 
                ref={currentTimeRef}
                className="absolute top-0 bottom-0 pointer-events-none z-20"
                style={{ 
                  left: `${timePosition.pixelPosition}px`,
                }}
              >
                <div className="relative h-full">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-red-500" />
                  <div className="absolute -top-1 -left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-lg whitespace-nowrap">
                    {timePosition.now && format(timePosition.now, "h:mm a")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </Card>
      )}

      {/* Week View */}
      {view === 'week' && (
        <WeekView 
          bays={bays}
          bookings={bookings}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
        />
      )}

      {/* Month View */}
      {view === 'month' && (
        <MonthView 
          bays={bays}
          bookings={bookings}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
        />
      )}

      {/* Quick Booking Dialog */}
      <QuickBookDialog 
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        bay={selectedSlot?.bay}
        hour={selectedSlot?.hour}
        selectedDate={selectedDate}
      />

      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </div>
  );
}

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

// Week View Component
function WeekView({ bays, bookings, selectedDate, onDayClick }: {
  bays: Bay[];
  bookings: Booking[];
  selectedDate: Date;
  onDayClick: (date: Date) => void;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
  });

  // Count bookings per bay per day
  const getBookingCount = (bayId: string, date: Date) => {
    return bookings.filter(b =>
      b.bayIds.includes(bayId) &&
      isSameDay(new Date(b.startTime), date)
    ).length;
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 bg-gradient-to-br from-muted/80 to-muted/40">
            <div className="p-4 font-semibold border-r border-b">Bays</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-4 text-center border-r last:border-r-0 border-b"
              >
                <div className="font-semibold">{format(day, 'EEE')}</div>
                <div className="text-sm text-muted-foreground">{format(day, 'MMM d')}</div>
                {isSameDay(day, new Date()) && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">Today</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Bay Rows */}
          {bays.map((bay) => (
            <div key={bay.id} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-4 border-r bg-muted/30 font-medium">{bay.name}</div>
              {weekDays.map((day) => {
                const bookingCount = getBookingCount(bay.id, day);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => onDayClick(day)}
                    className="p-4 border-r last:border-r-0 hover-elevate cursor-pointer"
                    data-testid={`week-cell-${bay.id}-${format(day, 'yyyy-MM-dd')}`}
                  >
                    {bookingCount > 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-full h-2 bg-primary/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(bookingCount * 20, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bookingCount} {bookingCount === 1 ? 'booking' : 'bookings'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground opacity-50">
                        Available
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Month View Component
function MonthView({ bays, bookings, selectedDate, onDayClick }: {
  bays: Bay[];
  bookings: Booking[];
  selectedDate: Date;
  onDayClick: (date: Date) => void;
}) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Calculate total bookings for a day across all bays
  const getTotalBookings = (date: Date) => {
    return bookings.filter(b => isSameDay(new Date(b.startTime), date)).length;
  };

  // Get color based on booking density
  const getDensityColor = (count: number) => {
    if (count === 0) return 'bg-muted/20';
    if (count <= 2) return 'bg-primary/20';
    if (count <= 5) return 'bg-primary/40';
    return 'bg-primary/60';
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2 mb-2">
            {week.map((day) => {
              const bookingCount = getTotalBookings(day);
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={`
                    p-4 rounded-lg border-2 transition-all cursor-pointer hover-elevate
                    ${isToday ? 'border-primary' : 'border-transparent'}
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${getDensityColor(bookingCount)}
                  `}
                  data-testid={`month-cell-${format(day, 'yyyy-MM-dd')}`}
                >
                  <div className="text-sm font-semibold mb-2">{format(day, 'd')}</div>
                  {bookingCount > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-[10px] font-medium">{bookingCount}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Quick Book Dialog Component
function QuickBookDialog({ 
  open, 
  onClose, 
  bay, 
  hour, 
  selectedDate 
}: { 
  open: boolean; 
  onClose: () => void; 
  bay?: Bay; 
  hour?: number;
  selectedDate: Date;
}) {
  const [duration, setDuration] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pay_at_desk" | "new_card" | "card_on_file" | "membership">("pay_at_desk");
  const { toast } = useToast();

  // Fetch all customers/members
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/members'],
    select: (data: any[]) => data.map(member => ({
      id: member.id || member.userId,
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
    })),
  });

  // Auto-populate customer when email is entered
  useEffect(() => {
    if (manualEmail && !selectedCustomer) {
      const matchingCustomer = customers.find(
        c => c.email.toLowerCase() === manualEmail.toLowerCase()
      );
      if (matchingCustomer) {
        setSelectedCustomer(matchingCustomer);
        setManualName(`${matchingCustomer.firstName} ${matchingCustomer.lastName}`);
        setManualPhone(matchingCustomer.phone || '');
        toast({
          title: "Customer Found",
          description: `Loaded details for ${matchingCustomer.firstName} ${matchingCustomer.lastName}`,
        });
      }
    }
  }, [manualEmail, customers, selectedCustomer, toast]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Booking Created",
        description: "The bay has been successfully booked.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setManualName("");
    setManualEmail("");
    setManualPhone("");
    setDuration(1);
    setPaymentMethod("pay_at_desk");
    onClose();
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setManualName(`${customer.firstName} ${customer.lastName}`);
    setManualEmail(customer.email);
    setManualPhone(customer.phone || '');
    setCustomerSearchOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setManualName("");
    setManualEmail("");
    setManualPhone("");
  };

  if (!bay || hour === undefined) return null;

  const startTime = setHours(startOfDay(selectedDate), hour);
  const endTime = setHours(startOfDay(selectedDate), hour + duration);

  const filteredCustomers = customers.filter(c => {
    const searchLower = customerSearch.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(searchLower) || c.email.toLowerCase().includes(searchLower);
  });

  const displayName = selectedCustomer 
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` 
    : manualName;

  const handleSubmit = () => {
    if (!displayName) {
      toast({
        title: "Missing Information",
        description: "Please enter a customer name or select a customer.",
        variant: "destructive",
      });
      return;
    }

    const bookingData: any = {
      bayIds: [bay.id],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      type: 'rental',
      paymentMethod,
    };
    
    // If existing customer selected, use their ID
    if (selectedCustomer) {
      bookingData.customerId = selectedCustomer.id;
      bookingData.notes = `Booking for ${selectedCustomer.firstName} ${selectedCustomer.lastName}`;
    } else {
      // Walk-in customer - send guest details
      bookingData.guestName = manualName;
      bookingData.guestEmail = manualEmail;
      bookingData.guestPhone = manualPhone;
      bookingData.notes = `Walk-in booking: ${manualName}${manualEmail ? ` (${manualEmail})` : ''}`;
    }
    
    createBookingMutation.mutate(bookingData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Quick Book Bay
          </DialogTitle>
          <DialogDescription>
            Create a booking for {bay.name} on {format(selectedDate, "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Bay Info */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bay</span>
                <span className="font-semibold">{bay.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Start Time</span>
                <span className="font-mono">{format(startTime, "h:mm a")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">End Time</span>
                <span className="font-mono">{format(endTime, "h:mm a")}</span>
              </div>
            </div>
          </Card>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="8"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              data-testid="input-duration"
            />
          </div>

          {/* Customer Search/Select */}
          <div className="space-y-2">
            <Label>Search Existing Customer</Label>
            <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerSearchOpen}
                  className="w-full justify-between"
                  data-testid="button-customer-search"
                >
                  {selectedCustomer 
                    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` 
                    : "Search customer..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search customers..." 
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCustomers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.id}
                          onSelect={() => handleCustomerSelect(customer)}
                          data-testid={`customer-option-${customer.id}`}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.firstName} {customer.lastName}</span>
                            <span className="text-xs text-muted-foreground">{customer.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedCustomer && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {selectedCustomer.email}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCustomer}
                  className="h-6 px-2"
                  data-testid="button-clear-customer"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Manual Entry (for new customers) */}
          {!selectedCustomer && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">Or create new customer:</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-name">Customer Name</Label>
                <Input
                  id="manual-name"
                  placeholder="Enter customer name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-email">Customer Email</Label>
                <Input
                  id="manual-email"
                  type="email"
                  placeholder="customer@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  data-testid="input-customer-email"
                />
                <p className="text-xs text-muted-foreground">
                  If email matches existing customer, their details will auto-populate
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-phone">Phone (optional)</Label>
                <Input
                  id="manual-phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  data-testid="input-customer-phone"
                />
              </div>
            </>
          )}

          {/* Payment Method */}
          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger id="payment-method" data-testid="select-payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pay_at_desk" data-testid="payment-option-pay-at-desk">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pay at Desk
                  </div>
                </SelectItem>
                <SelectItem value="new_card" data-testid="payment-option-new-card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Charge Card Now
                  </div>
                </SelectItem>
                <SelectItem value="card_on_file" data-testid="payment-option-card-on-file">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card on File
                  </div>
                </SelectItem>
                <SelectItem value="membership" data-testid="payment-option-membership">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Use Membership Hours
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {paymentMethod === "pay_at_desk" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3" />
                Remember to collect payment when customer arrives
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1" 
            disabled={!displayName || createBookingMutation.isPending}
            data-testid="button-create-booking"
          >
            {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Booking Details Dialog Component
function BookingDetailsDialog({
  open,
  onClose,
  booking,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
}) {
  const { toast } = useToast();

  const checkInMutation = useMutation({
    mutationFn: async (status: "checked_in" | "no_show") => {
      return apiRequest(`/api/bookings/${booking!.id}/check-in`, {
        method: 'PATCH',
        body: JSON.stringify({ checkInStatus: status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Check-in Updated",
        description: "Booking check-in status has been updated.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update check-in status.",
        variant: "destructive",
      });
    },
  });

  if (!booking) return null;

  const handleCheckIn = () => {
    checkInMutation.mutate("checked_in");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <Card className="p-4 bg-primary/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-lg">{booking.userName || 'Customer'}</div>
                {booking.userEmail && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {booking.userEmail}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Booking Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Booking Type</span>
              <Badge variant="secondary" className="capitalize">{booking.type}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Start Time</span>
              <span className="font-mono">{format(new Date(booking.startTime), "MMM d, h:mm a")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">End Time</span>
              <span className="font-mono">{format(new Date(booking.endTime), "MMM d, h:mm a")}</span>
            </div>
            {booking.amount && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold">${booking.amount}</span>
              </div>
            )}
            
            {/* Payment Method - Prominent for Pay at Desk */}
            {booking.paymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                {booking.paymentMethod === 'pay_at_desk' && booking.paymentStatus !== 'paid' ? (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    PAY AT DESK
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="capitalize">
                    {booking.paymentMethod.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            )}
            
            {booking.paymentStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'} className="capitalize">
                  {booking.paymentStatus}
                </Badge>
              </div>
            )}

            {/* Check-in Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Check-in Status</span>
              {booking.checkInStatus === 'checked_in' ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Checked In
                </Badge>
              ) : booking.checkInStatus === 'no_show' ? (
                <Badge variant="default" className="bg-red-600 hover:bg-red-700 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  No Show
                </Badge>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {booking.checkInStatus?.replace(/_/g, ' ') || 'pending'}
                </Badge>
              )}
            </div>

            {booking.checkedInAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Checked In At</span>
                <span className="font-mono text-sm">{format(new Date(booking.checkedInAt), "MMM d, h:mm a")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-close">
            Close
          </Button>
          {booking.checkInStatus === 'pending' && (
            <Button 
              variant="default" 
              className="flex-1 bg-green-600 hover:bg-green-700" 
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
              data-testid="button-check-in"
            >
              {checkInMutation.isPending ? "Checking In..." : "Check In"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
