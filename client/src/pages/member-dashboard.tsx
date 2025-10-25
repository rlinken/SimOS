import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Clock, MapPin, User, CreditCard, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, MembershipTier, Bay, Offering } from "@shared/schema";
import { format, addDays, isSameDay, parseISO, addMinutes } from "date-fns";

type EnrichedBooking = Booking & {
  user?: any;
  bay?: any;
};

const bookingSchema = z.object({
  bayId: z.number().optional(),
  offeringId: z.number().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  duration: z.string().min(1, "Duration is required"),
  notes: z.string().optional(),
  includeBay: z.boolean().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function MemberDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"all" | "bays" | "lessons" | "fittings">("all");
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingType, setBookingType] = useState<"rental" | "lesson" | "fitting">("rental");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; hour: number } | null>(null);

  const { data: bookings = [] } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: membershipTiers = [] } = useQuery<MembershipTier[]>({
    queryKey: ["/api/membership-tiers"],
  });

  const { data: bays = [] } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  const { data: offerings = [] } = useQuery<Offering[]>({
    queryKey: ["/api/offerings"],
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      duration: "60",
      notes: "",
      includeBay: false,
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const startTime = new Date(`${data.date}T${data.time}`);
      const endTime = addMinutes(startTime, parseInt(data.duration));

      // For rentals, bayId is required. For lessons/fittings, it's optional
      const payload: any = {
        type: bookingType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: data.notes,
        paymentStatus: "pending",
      };

      // Only include bayId if it's a rental OR if includeBay is checked
      if (bookingType === "rental" || data.includeBay) {
        payload.bayId = data.bayId;
      }

      if (data.offeringId) {
        payload.offeringId = data.offeringId;
      }

      return apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Created",
        description: "Your booking has been successfully created.",
      });
      setBookingDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOpenBooking = (type: "rental" | "lesson" | "fitting", timeSlot?: { date: Date; hour: number }) => {
    setBookingType(type);
    
    // If a time slot was provided, pre-fill the form
    if (timeSlot) {
      const timeString = `${timeSlot.hour.toString().padStart(2, '0')}:00`;
      form.reset({
        date: format(timeSlot.date, "yyyy-MM-dd"),
        time: timeString,
        duration: "60",
        notes: "",
        includeBay: false,
      });
    }
    
    setBookingDialogOpen(true);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedTimeSlot({ date, hour });
    // Don't open dialog yet - let user choose booking type
  };

  const handleBookingTypeSelect = (type: "rental" | "lesson" | "fitting") => {
    if (selectedTimeSlot) {
      handleOpenBooking(type, selectedTimeSlot);
      setSelectedTimeSlot(null);
    }
  };

  const onSubmitBooking = (data: BookingFormData) => {
    createBookingMutation.mutate(data);
  };

  const filteredOfferings = offerings.filter((offering) => {
    if (bookingType === "lesson") return offering.type === "lesson";
    if (bookingType === "fitting") return offering.type === "fitting";
    return false;
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

  // Filter ALL facility bookings by view mode (not just user's bookings)
  // This ensures we show true availability across all members
  const filteredBookings = bookings.filter((booking) => {
    if (viewMode === "all") return true;
    if (viewMode === "bays") return booking.type === "rental";
    if (viewMode === "lessons") return booking.type === "lesson";
    if (viewMode === "fittings") return booking.type === "fitting";
    return true;
  });

  // Get week dates for calendar view - always start with today on the left
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));

  // Generate hourly time slots (7 AM to 10 PM)
  const timeSlots = Array.from({ length: 15 }, (_, i) => i + 7); // 7-21 (7am-9pm)

  // Check if a time slot is booked (including multi-hour bookings and partial hours)
  const isSlotBooked = (date: Date, hour: number) => {
    return filteredBookings.some((booking) => {
      const bookingStart = parseISO(booking.startTime as any);
      const bookingEnd = parseISO(booking.endTime as any);
      
      // Create the time slot boundaries (hour:00 to hour:59:59)
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour, 59, 59, 999);
      
      // Slot is booked if there's any overlap between booking and slot
      // Booking overlaps if: bookingStart < slotEnd AND bookingEnd > slotStart
      return bookingStart < slotEnd && bookingEnd > slotStart;
    });
  };

  // Get booking for a specific slot (returns the first booking that covers this time)
  const getSlotBooking = (date: Date, hour: number) => {
    return filteredBookings.find((booking) => {
      const bookingStart = parseISO(booking.startTime as any);
      const bookingEnd = parseISO(booking.endTime as any);
      
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour, 59, 59, 999);
      
      return bookingStart < slotEnd && bookingEnd > slotStart;
    });
  };

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
        <Card
          className="p-6 hover-elevate cursor-pointer"
          onClick={() => handleOpenBooking("rental")}
          data-testid="card-book-bay"
        >
          <MapPin className="w-8 h-8 mb-3 text-primary" />
          <h3 className="font-semibold mb-1">Book a Bay</h3>
          <p className="text-sm text-muted-foreground">Reserve simulator time</p>
        </Card>
        <Card
          className="p-6 hover-elevate cursor-pointer"
          onClick={() => handleOpenBooking("lesson")}
          data-testid="card-book-lesson"
        >
          <User className="w-8 h-8 mb-3 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold mb-1">Schedule Lesson</h3>
          <p className="text-sm text-muted-foreground">Book with an instructor</p>
        </Card>
        <Card
          className="p-6 hover-elevate cursor-pointer"
          onClick={() => handleOpenBooking("fitting")}
          data-testid="card-book-fitting"
        >
          <Clock className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold mb-1">Club Fitting</h3>
          <p className="text-sm text-muted-foreground">Get professionally fitted</p>
        </Card>
      </div>

      {/* Booking Type Selection Dialog */}
      <Dialog open={!!selectedTimeSlot} onOpenChange={(open) => !open && setSelectedTimeSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Booking Type</DialogTitle>
            <DialogDescription>
              {selectedTimeSlot && (
                <>
                  {format(selectedTimeSlot.date, "EEEE, MMMM d, yyyy")} at{" "}
                  {format(new Date().setHours(selectedTimeSlot.hour, 0, 0, 0), "h:mm a")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => handleBookingTypeSelect("rental")}
              data-testid="button-select-bay-rental"
            >
              <MapPin className="w-5 h-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Bay Rental</div>
                <div className="text-sm text-muted-foreground">Reserve simulator time</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => handleBookingTypeSelect("lesson")}
              data-testid="button-select-lesson"
            >
              <User className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
              <div className="text-left">
                <div className="font-semibold">Lesson</div>
                <div className="text-sm text-muted-foreground">Book with an instructor</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => handleBookingTypeSelect("fitting")}
              data-testid="button-select-fitting"
            >
              <Clock className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <div className="font-semibold">Club Fitting</div>
                <div className="text-sm text-muted-foreground">Get professionally fitted</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bookingType === "rental" && "Book a Bay"}
              {bookingType === "lesson" && "Schedule a Lesson"}
              {bookingType === "fitting" && "Book a Club Fitting"}
            </DialogTitle>
            <DialogDescription>
              {bookingType === "rental" && "Select a bay and time for your simulator session"}
              {bookingType === "lesson" && "Choose an instructor and schedule your lesson"}
              {bookingType === "fitting" && "Book a professional club fitting session"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitBooking)} className="space-y-6">
              {/* Bay selection for rentals (required) */}
              {bookingType === "rental" && (
                <FormField
                  control={form.control}
                  name="bayId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Bay</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-bay">
                            <SelectValue placeholder="Choose a bay" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bays.map((bay) => (
                            <SelectItem key={bay.id} value={bay.id.toString()}>
                              {bay.name} - {bay.tier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Optional bay inclusion for lessons/fittings */}
              {(bookingType === "lesson" || bookingType === "fitting") && (
                <>
                  <FormField
                    control={form.control}
                    name="includeBay"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-include-bay"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">
                          Include bay reservation
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("includeBay") && (
                    <FormField
                      control={form.control}
                      name="bayId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Bay</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-bay">
                                <SelectValue placeholder="Choose a bay" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bays.map((bay) => (
                                <SelectItem key={bay.id} value={bay.id.toString()}>
                                  {bay.name} - {bay.tier}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {(bookingType === "lesson" || bookingType === "fitting") && (
                <FormField
                  control={form.control}
                  name="offeringId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {bookingType === "lesson" ? "Select Lesson" : "Select Fitting"}
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-offering">
                            <SelectValue placeholder="Choose an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredOfferings.map((offering) => (
                            <SelectItem key={offering.id} value={offering.id.toString()}>
                              {offering.name} - ${offering.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-duration">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requests or notes..."
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBookingMutation.isPending}
                  data-testid="button-confirm-booking"
                >
                  {createBookingMutation.isPending ? "Creating..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Calendar and Bookings */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <CalendarIcon className="w-4 h-4 mr-2" />
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

          {/* Hourly Schedule View */}
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

            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header with days */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="text-xs font-semibold text-muted-foreground p-2">Time</div>
                  {weekDates.map((date) => {
                    const isToday = isSameDay(date, new Date());
                    return (
                      <div
                        key={date.toISOString()}
                        className={`text-center p-2 rounded ${
                          isToday ? "bg-primary/10 border border-primary/20" : ""
                        }`}
                      >
                        <div className="text-xs text-muted-foreground">
                          {format(date, "EEE")}
                        </div>
                        <div className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                          {format(date, "MMM d")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time slots grid */}
                <div className="space-y-1">
                  {timeSlots.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 gap-1">
                      <div className="text-xs text-muted-foreground p-2 flex items-center">
                        {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                      </div>
                      {weekDates.map((date) => {
                        const booking = getSlotBooking(date, hour);
                        const isBooked = !!booking;
                        const isPast = date < new Date() || (isSameDay(date, new Date()) && hour < new Date().getHours());

                        const isMyBooking = booking?.userId === user?.id;

                        return (
                          <div
                            key={`${date.toISOString()}-${hour}`}
                            className={`relative min-h-[60px] rounded border p-2 transition-colors ${
                              isPast
                                ? "bg-muted/50 cursor-not-allowed"
                                : isBooked
                                ? `${getBookingColor(booking.type)} ${isMyBooking ? 'border-2 border-primary' : ''}`
                                : "border-dashed hover:bg-accent/50 cursor-pointer hover-elevate"
                            }`}
                            onClick={() => !isPast && !isBooked && handleTimeSlotClick(date, hour)}
                            data-testid={`timeslot-${format(date, "yyyy-MM-dd")}-${hour}`}
                          >
                            {isBooked ? (
                              <div className="text-xs">
                                <div className="font-medium truncate">
                                  {getTypeLabel(booking.type)}
                                  {isMyBooking && " (You)"}
                                </div>
                                <div className="text-xs opacity-75 truncate">
                                  {format(parseISO(booking.startTime as any), "h:mm a")} - {format(parseISO(booking.endTime as any), "h:mm a")}
                                </div>
                              </div>
                            ) : !isPast ? (
                              <div className="text-xs text-muted-foreground text-center">
                                Click to book
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
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
                          <CalendarIcon className="w-4 h-4" />
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
