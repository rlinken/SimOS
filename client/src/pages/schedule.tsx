import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Mail, Phone, Plus, X } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfDay, setHours, setMinutes, isSameDay, isWithinInterval } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  userEmail?: string;
  userPhone?: string;
  amount?: string;
  paymentStatus?: string;
};

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ bay: Bay; hour: number } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();
  
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

  // Operating hours (6 AM to 10 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Helper to check if a bay is booked at a specific hour
  const isBooked = (bayId: string, hour: number) => {
    const slotStart = setMinutes(setHours(dayStart, hour), 0);
    const slotEnd = setMinutes(setHours(dayStart, hour), 59);

    return dayBookings.find(booking => {
      if (booking.bayId !== bayId) return false;
      
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);

      return isWithinInterval(slotStart, { start: bookingStart, end: bookingEnd }) ||
             isWithinInterval(slotEnd, { start: bookingStart, end: bookingEnd }) ||
             (bookingStart <= slotStart && bookingEnd >= slotEnd);
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

  const handleSlotClick = (bay: Bay, hour: number) => {
    const booking = isBooked(bay.id, hour);
    if (booking) {
      setSelectedBooking(booking);
    } else if (bay.status === 'active') {
      setSelectedSlot({ bay, hour });
    }
  };

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
      </div>

      {/* Date Navigation - Apple Style */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="rounded-full"
              data-testid="button-prev-day"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl font-semibold">
                {format(selectedDate, "EEEE")}
              </div>
              <div className="text-lg text-muted-foreground">
                {format(selectedDate, "MMMM d, yyyy")}
              </div>
              {isSameDay(selectedDate, new Date()) && (
                <Badge variant="default" className="mt-1">Today</Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="rounded-full"
              data-testid="button-next-day"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Schedule Grid - Apple Style */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header Row */}
            <div className="grid grid-cols-[220px_repeat(17,1fr)] bg-muted/50 sticky top-0 z-10">
              <div className="p-4 font-semibold border-r border-b flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Bays</span>
              </div>
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="p-3 text-center text-sm font-medium border-r last:border-r-0 border-b"
                  data-testid={`header-hour-${hour}`}
                >
                  {format(setHours(new Date(), hour), "h a")}
                </div>
              ))}
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
                  className={`grid grid-cols-[220px_repeat(17,1fr)] border-b last:border-b-0 hover:bg-muted/20 transition-colors ${getTierColor(bay.tier)}`}
                  data-testid={`bay-row-${bay.id}`}
                >
                  {/* Bay Name Column */}
                  <div className="p-4 border-r flex flex-col gap-2 bg-card/50">
                    <div className="font-semibold text-base">{bay.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getTierBadgeVariant(bay.tier)} className="text-xs capitalize">
                        {bay.tier}
                      </Badge>
                      {bay.status !== 'active' && (
                        <Badge variant="destructive" className="text-xs capitalize">
                          {bay.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {hours.map(hour => {
                    const booking = isBooked(bay.id, hour);
                    const isAvailable = !booking && bay.status === 'active';

                    return (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(bay, hour)}
                        className={`
                          p-3 border-r last:border-r-0 min-h-[100px] 
                          flex flex-col items-center justify-center text-xs 
                          transition-all cursor-pointer relative group
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
                              {booking.userName || 'Customer'}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(booking.startTime), "h:mm")} - {format(new Date(booking.endTime), "h:mm a")}
                            </div>
                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 rounded transition-colors pointer-events-none" />
                          </div>
                        ) : isAvailable ? (
                          <div className="text-center space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">Click to Book</div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground capitalize">{bay.status}</div>
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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const { toast } = useToast();

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
      onClose();
      setCustomerName("");
      setCustomerEmail("");
      setDuration(1);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!bay || hour === undefined) return null;

  const startTime = setHours(startOfDay(selectedDate), hour);
  const endTime = setHours(startOfDay(selectedDate), hour + duration);

  const handleSubmit = () => {
    createBookingMutation.mutate({
      bayId: bay.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      type: 'rental',
      notes: `Quick booking for ${customerName}`,
    });
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

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              data-testid="input-customer-name"
            />
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="customer-email">Customer Email (optional)</Label>
            <Input
              id="customer-email"
              type="email"
              placeholder="customer@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              data-testid="input-customer-email"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1" 
            disabled={!customerName || createBookingMutation.isPending}
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
  if (!booking) return null;

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
            {booking.paymentStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'} className="capitalize">
                  {booking.paymentStatus}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-close">
            Close
          </Button>
          <Button variant="default" className="flex-1" data-testid="button-view-profile">
            View Customer Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
