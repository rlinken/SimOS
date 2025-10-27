import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Plus,
  User,
  Target,
  X,
  Check,
  ChevronsUpDown,
  Mail,
  Phone,
  GraduationCap,
  Package,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { format, startOfDay, addHours, addMinutes, isSameDay, parseISO, isAfter, setHours, setMinutes, isWithinInterval } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Bay } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ bay: Bay; hour: number } | null>(null);
  const [draggedBooking, setDraggedBooking] = useState<(Booking & { bays: Bay[]; user: any }) | null>(null);
  const [dropTarget, setDropTarget] = useState<{ bayId: string; hour: number } | null>(null);
  const { toast } = useToast();
  const scheduleRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

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

  // Operating hours (6 AM to 10 PM) - render all hours for scrolling
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Check if a time slot is in the past
  const isPastHour = (hour: number) => {
    if (!isSameDay(selectedDate, now)) {
      return false; // Don't gray out if viewing different date
    }
    const currentHour = now.getHours();
    return hour < currentHour;
  };

  // Get bookings for a specific bay
  const getBayBookings = (bayId: string) => {
    return todayBookings.filter(booking => 
      booking.bays.some(b => b.id === bayId)
    );
  };

  // Check if a bay has any booking during a specific hour
  const hasBookingInHour = (bayId: string, hour: number) => {
    const dayStart = startOfDay(selectedDate);
    const slotStart = setHours(dayStart, hour);
    const slotEnd = addHours(slotStart, 1);

    return todayBookings.some(booking => {
      if (!booking.bays.some(b => b.id === bayId)) return false;
      
      const bookingStart = parseISO(booking.startTime);
      const bookingEnd = parseISO(booking.endTime);

      // Check if booking overlaps with this hour slot
      return bookingStart < slotEnd && bookingEnd > slotStart;
    });
  };

  // Calculate booking position and width based on actual times
  const getBookingPosition = (booking: Booking & { bays: Bay[]; user: any }) => {
    const startTime = parseISO(booking.startTime);
    const endTime = parseISO(booking.endTime);
    const dayStart = setHours(startOfDay(selectedDate), 6); // 6 AM start
    
    // Calculate minutes from start of day (6 AM)
    const startMinutes = (startTime.getHours() - 6) * 60 + startTime.getMinutes();
    const endMinutes = (endTime.getHours() - 6) * 60 + endTime.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // Each hour column is 150px (matching grid), so each minute is 150/60 = 2.5px
    const HOUR_WIDTH = 150;
    const pixelsPerMinute = HOUR_WIDTH / 60;
    const left = startMinutes * pixelsPerMinute;
    const width = duration * pixelsPerMinute;
    
    return { left, width };
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, booking: Booking & { bays: Bay[]; user: any }) => {
    e.stopPropagation();
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, bayId: string, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ bayId, hour });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const rescheduleBookingMutation = useMutation({
    mutationFn: async ({ bookingId, newBayId, newStartTime, newEndTime }: {
      bookingId: string;
      newBayId: string;
      newStartTime: string;
      newEndTime: string;
    }) => {
      return apiRequest(`/api/bookings/${bookingId}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          bayIds: [newBayId],
          startTime: newStartTime,
          endTime: newEndTime,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Booking Rescheduled",
        description: "The booking has been moved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reschedule booking. There may be a conflict.",
        variant: "destructive",
      });
    },
  });

  const handleDrop = (e: React.DragEvent, bayId: string, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedBooking) return;

    // Find the target bay
    const targetBay = bays.find(b => b.id === bayId);
    if (!targetBay) return;

    // Check if target slot is valid (not past and bay is active)
    if (isPastHour(hour)) {
      toast({
        title: "Invalid Drop",
        description: "Cannot reschedule to a past time slot.",
        variant: "destructive",
      });
      setDraggedBooking(null);
      setDropTarget(null);
      return;
    }

    if (targetBay.status !== 'active') {
      toast({
        title: "Invalid Drop",
        description: "Cannot reschedule to an inactive bay.",
        variant: "destructive",
      });
      setDraggedBooking(null);
      setDropTarget(null);
      return;
    }

    // Calculate new start and end times while preserving the original minute offset
    const oldStart = new Date(draggedBooking.startTime);
    const oldEnd = new Date(draggedBooking.endTime);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const originalMinutes = oldStart.getMinutes();

    // New start time at the dropped hour, preserving the minute offset
    const newStart = setMinutes(setHours(startOfDay(selectedDate), hour), originalMinutes);
    const newEnd = new Date(newStart.getTime() + duration);

    // Check if rescheduling to same bay and same time
    if (draggedBooking.bayIds?.includes(bayId) && 
        oldStart.getTime() === newStart.getTime()) {
      setDraggedBooking(null);
      setDropTarget(null);
      return;
    }

    // Reschedule the booking
    rescheduleBookingMutation.mutate({
      bookingId: draggedBooking.id,
      newBayId: bayId,
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
    });

    setDraggedBooking(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedBooking(null);
    setDropTarget(null);
  };

  const handleSlotClick = (bay: Bay, hour: number) => {
    const hasBooking = hasBookingInHour(bay.id, hour);
    if (!hasBooking && bay.status === 'active' && !isPastHour(hour)) {
      setSelectedSlot({ bay, hour });
    }
  };

  const handleBookingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation('/bookings');
  };

  // Calculate current time position for indicator
  const getCurrentTimePosition = () => {
    if (!isSameDay(selectedDate, now)) return null;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only show indicator during operating hours
    if (currentHour < 6 || currentHour >= 23) return null;
    
    // Find the index of the current hour in the hours array
    const firstHour = hours[0];
    const hourIndex = currentHour - firstHour;
    const minuteFraction = currentMinute / 60;
    const totalColumns = hours.length;
    
    // Position as percentage of the time columns only
    const position = ((hourIndex + minuteFraction) / totalColumns) * 100;
    
    return { position, hour: currentHour, minute: currentMinute };
  };

  const timePosition = getCurrentTimePosition();

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (isSameDay(selectedDate, now) && scheduleRef.current) {
      const timer = setTimeout(() => {
        const currentHour = now.getHours();
        const hourIndex = currentHour - 6; // 6 AM is index 0
        const scrollPosition = hourIndex * 150 - 300; // Scroll to show current hour with some context before it
        scheduleRef.current?.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, now]);

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

      {/* Two Column Layout: Next Bookings + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Next Bookings */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Next Bookings</h3>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No upcoming bookings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => setLocation('/schedule')}
                  data-testid={`booking-item-${booking.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">
                        {booking.user?.firstName} {booking.user?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {booking.bays.map(b => b.name).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-base font-semibold font-mono">
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

        {/* Right Column: Quick Actions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <Link href="/members">
              <button
                className="w-full p-3 text-left rounded-lg border hover-elevate active-elevate-2 flex items-center justify-between group"
                data-testid="button-manage-members"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="font-medium text-sm">Manage Members</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </Link>

            <Link href="/lessons">
              <button
                className="w-full p-3 text-left rounded-lg border hover-elevate active-elevate-2 flex items-center justify-between group"
                data-testid="button-schedule-lessons"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="font-medium text-sm">Schedule Lessons</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </Link>

            <Link href="/fittings">
              <button
                className="w-full p-3 text-left rounded-lg border hover-elevate active-elevate-2 flex items-center justify-between group"
                data-testid="button-schedule-fitting"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div className="font-medium text-sm">Schedule Fitting</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </Link>

            <Link href="/products">
              <button
                className="w-full p-3 text-left rounded-lg border hover-elevate active-elevate-2 flex items-center justify-between group"
                data-testid="button-products"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div className="font-medium text-sm">Products</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Today's Schedule - Matching Full Schedule Page */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="p-6 pb-4 bg-gradient-to-br from-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Today's Schedule</h2>
              <p className="text-sm text-muted-foreground mt-1">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto max-w-full" ref={scheduleRef}>
          <div className="inline-block min-w-full relative">
            {/* Header Row */}
            <div 
              className="grid bg-gradient-to-br from-muted/80 to-muted/40 sticky top-0 z-10 backdrop-blur-sm"
              style={{ gridTemplateColumns: `80px repeat(${hours.length}, 150px)` }}
            >
              <div className="p-3 font-semibold border-r border-b flex items-center justify-center sticky left-0 z-20 bg-gradient-to-br from-muted/80 to-muted/40">
                <span className="text-xs">Bays</span>
              </div>
              {hours.map(hour => {
                const isPast = isPastHour(hour);
                const displayHour = hour > 12 ? hour - 12 : hour;
                const ampm = hour < 12 ? 'AM' : 'PM';
                const isEvenHour = hour % 2 === 0;
                return (
                  <div 
                    key={hour} 
                    className={`p-2 text-center border-r-2 last:border-r-0 border-b flex flex-col items-center justify-center ${
                      isPast ? 'opacity-40' : ''
                    } ${isEvenHour ? 'bg-muted/20' : 'bg-background'}`}
                  >
                    <div className="text-xs font-bold font-mono">{displayHour}:00</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-medium">{ampm}</div>
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
              bays.map(bay => {
                const bayBookings = getBayBookings(bay.id);
                
                return (
                  <div 
                    key={bay.id} 
                    className="grid border-b last:border-b-0 transition-all relative"
                    style={{ gridTemplateColumns: `80px repeat(${hours.length}, 150px)` }}
                  >
                    {/* Bay Name Column */}
                    <div className="p-2 border-r flex items-center justify-center bg-muted/30 sticky left-0 z-10">
                      <div className="font-semibold text-xs text-center leading-tight">{bay.name}</div>
                    </div>

                    {/* Time Slots (Background Grid) */}
                    {hours.map(hour => {
                      const isPast = isPastHour(hour);
                      const isAvailable = bay.status === 'active' && !isPast;
                      const isEvenHour = hour % 2 === 0;

                      return (
                        <div
                          key={hour}
                          onClick={() => handleSlotClick(bay, hour)}
                          onDragOver={(e) => handleDragOver(e, bay.id, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, bay.id, hour)}
                          className={`
                            p-2 border-r-2 last:border-r-0 min-h-[80px] 
                            flex flex-col items-center justify-center text-xs 
                            transition-all relative group
                            ${!isAvailable ? 'bg-muted/50 cursor-not-allowed' : ''}
                            ${isAvailable ? 'cursor-pointer' : ''}
                            ${isAvailable && isEvenHour ? 'bg-muted/10' : ''}
                            ${isAvailable && !isEvenHour ? 'bg-background' : ''}
                            ${isAvailable ? 'hover:bg-green-50 dark:hover:bg-green-950/20' : ''}
                            ${isPast ? 'opacity-40' : ''}
                            ${dropTarget?.bayId === bay.id && dropTarget?.hour === hour ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''}
                          `}
                          data-testid={`slot-${bay.id}-${hour}`}
                        >
                          {/* Quarter-hour tick marks */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            <div className="w-1/4 border-r border-border/20" />
                            <div className="w-1/4 border-r border-border/30" />
                            <div className="w-1/4 border-r border-border/20" />
                            <div className="w-1/4" />
                          </div>
                          
                          {isAvailable && (
                            <div className="text-center space-y-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                              <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-primary" />
                              </div>
                              <div className="text-xs font-medium text-muted-foreground">Book</div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Bookings Layer (Absolutely Positioned) */}
                    {bayBookings.map(booking => {
                      const { left, width } = getBookingPosition(booking);
                      const isDragging = draggedBooking?.id === booking.id;
                      const canDrag = booking.paymentStatus !== 'cancelled';
                      
                      return (
                        <div
                          key={booking.id}
                          draggable={canDrag}
                          onDragStart={(e) => canDrag && handleDragStart(e, booking)}
                          onDragEnd={handleDragEnd}
                          onClick={() => !isDragging && handleBookingClick}
                          className={`absolute top-0 h-full flex items-center z-20 group ${canDrag ? 'cursor-move' : 'cursor-not-allowed'} ${isDragging ? 'opacity-50' : ''}`}
                          style={{ 
                            left: `${80 + left}px`,
                            width: `${width}px`,
                          }}
                        >
                          <div className="relative w-full h-16 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg p-2 transition-colors">
                            <div className="text-center space-y-1 h-full flex flex-col items-center justify-center">
                              <div className="w-6 h-6 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                              <div className="font-semibold text-foreground text-[10px] leading-tight truncate max-w-full px-1">
                                {booking.user?.firstName} {booking.user?.lastName}
                              </div>
                              <div className="text-[9px] text-muted-foreground flex items-center justify-center gap-1 truncate max-w-full">
                                <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{format(parseISO(booking.startTime), "h:mm")} - {format(parseISO(booking.endTime), "h:mm a")}</span>
                              </div>
                            </div>
                            <div className={`absolute inset-0 border-2 rounded-lg transition-colors pointer-events-none ${
                              booking.paymentStatus === 'pending' 
                                ? 'border-amber-500 group-hover:border-amber-600' 
                                : 'border-transparent group-hover:border-primary/50'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Current Time Indicator */}
            {timePosition && (
              <div 
                ref={currentTimeRef}
                className="absolute top-0 bottom-0 pointer-events-none z-20"
                style={{ 
                  left: `calc(80px + ${timePosition.position}%)`,
                }}
              >
                <div className="relative h-full">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-red-500" />
                  <div className="absolute -top-1 -left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-lg whitespace-nowrap">
                    {format(now, "h:mm a")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Booking Dialog */}
      <QuickBookDialog 
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        bay={selectedSlot?.bay}
        hour={selectedSlot?.hour}
        selectedDate={selectedDate}
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
  const [duration, setDuration] = useState(1); // Duration in hours
  const [startMinute, setStartMinute] = useState(0); // 0, 15, 30, or 45
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
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
      return apiRequest('POST', '/api/bookings', data);
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
    setStartMinute(0);
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

  const startTime = setMinutes(setHours(startOfDay(selectedDate), hour), startMinute);
  const endTime = addHours(startTime, duration);

  // Generate time options for the selected hour
  const timeOptions = [
    { value: 0, label: format(setMinutes(setHours(startOfDay(selectedDate), hour), 0), 'h:mm a') },
    { value: 15, label: format(setMinutes(setHours(startOfDay(selectedDate), hour), 15), 'h:mm a') },
    { value: 30, label: format(setMinutes(setHours(startOfDay(selectedDate), hour), 30), 'h:mm a') },
    { value: 45, label: format(setMinutes(setHours(startOfDay(selectedDate), hour), 45), 'h:mm a') },
  ];

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

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="start-minute">Start Time</Label>
            <Select 
              value={startMinute.toString()} 
              onValueChange={(value) => setStartMinute(parseInt(value))}
            >
              <SelectTrigger id="start-minute" data-testid="select-start-minute">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Select 
              value={duration.toString()} 
              onValueChange={(value) => setDuration(parseInt(value))}
            >
              <SelectTrigger id="duration" data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="5">5 hours</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="7">7 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
              </SelectContent>
            </Select>
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
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  {selectedCustomer.email}
                </span>
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
