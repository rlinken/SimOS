import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Plus, Clock, MapPin, DollarSign, CheckCircle2, X, CreditCard, User as UserIcon, Timer, ChevronsUpDown, Check, MoreVertical, Edit, RefreshCcw, Ban, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Bay, User } from "@shared/schema";
import { insertBookingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { z } from "zod";

const bookingFormSchema = insertBookingSchema
  .omit({ 
    facilityId: true,
    userId: true,
  })
  .extend({
    bayIds: z.array(z.string()).optional(),
    numberOfBays: z.number().min(1).optional(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    customerId: z.string().optional(),
    guestName: z.string().optional(),
    guestEmail: z.string().optional(),
    guestPhone: z.string().optional(),
  });

type BookingFormData = z.infer<typeof bookingFormSchema>;

// Label mappings for cleaner display
const BOOKING_TYPE_LABELS: Record<string, string> = {
  rental: "Sim Rental",
  lesson: "Lesson",
  fitting: "Club Fitting",
  event: "Event",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card_on_file: "Card on File",
  new_card: "Paid Online",
  pay_at_desk: "Pay At Desk",
  membership: "Member",
};

export default function BookingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useAutoAssign, setUseAutoAssign] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'card_on_file' | 'new_card'>('card_on_file');
  const [isTopOffDialogOpen, setIsTopOffDialogOpen] = useState(false);
  const [selectedBookingForTopOff, setSelectedBookingForTopOff] = useState<string | null>(null);
  const [topOffMinutes, setTopOffMinutes] = useState(30);
  const [topOffPrice, setTopOffPrice] = useState("32.50");
  const [showArchivedBookings, setShowArchivedBookings] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const { toast } = useToast();

  // Auto-calculate price when time changes ($32.50 per 30 minutes)
  useEffect(() => {
    const calculatedPrice = (topOffMinutes / 30) * 32.50;
    setTopOffPrice(calculatedPrice.toFixed(2));
  }, [topOffMinutes]);

  const { data: bookings, isLoading } = useQuery<(Booking & { bays: Bay[]; user: User })[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: bays } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  const { data: staffMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/staff"],
  });

  const { data: customers = [] } = useQuery<User[]>({
    queryKey: ["/api/members"],
  });

  // Categorize bookings
  const now = new Date();
  const currentAndFutureBookings = bookings?.filter(booking => 
    new Date(booking.endTime) >= now
  ) || [];
  
  const unpaidPastBookings = bookings?.filter(booking => 
    new Date(booking.endTime) < now && booking.paymentStatus !== 'paid'
  ) || [];
  
  const archivedBookings = bookings?.filter(booking => 
    new Date(booking.endTime) < now && booking.paymentStatus === 'paid'
  ) || [];

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      bayIds: [],
      numberOfBays: 1,
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      type: "rental",
      paymentStatus: "pending",
      paymentMethod: "pay_at_desk",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const startTime = new Date(`${data.date}T${data.startTime}:00`);
      const endTime = new Date(`${data.date}T${data.endTime}:00`);
      
      const bookingData: any = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: data.type,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
      };
      
      if (data.bayIds && data.bayIds.length > 0) {
        bookingData.bayIds = data.bayIds;
      } else if (data.numberOfBays) {
        bookingData.numberOfBays = data.numberOfBays;
      }
      
      if (data.referredBy) {
        bookingData.referredBy = data.referredBy;
      }
      
      // Add customer data
      if (data.customerId) {
        bookingData.customerId = data.customerId;
      } else if (data.guestName) {
        bookingData.guestName = data.guestName;
        bookingData.guestEmail = data.guestEmail;
        bookingData.guestPhone = data.guestPhone;
      }
      
      return apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedCustomer(null);
      setCustomerSearch("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update booking type
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      return apiRequest("PATCH", `/api/bookings/${id}`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Updated",
        description: "Booking type updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking type",
        variant: "destructive",
      });
    },
  });

  // Update payment method
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      // If changing to "Paid Online" or "Member", automatically mark as paid
      const updateData: any = { paymentMethod };
      if (paymentMethod === 'new_card' || paymentMethod === 'membership') {
        updateData.paymentStatus = 'paid';
      }
      return apiRequest("PATCH", `/api/bookings/${id}`, updateData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      const isAutoPaid = variables.paymentMethod === 'new_card' || variables.paymentMethod === 'membership';
      toast({
        title: isAutoPaid ? "Payment Complete" : "Updated",
        description: isAutoPaid 
          ? "Payment method updated and marked as paid" 
          : "Payment method updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payment method",
        variant: "destructive",
      });
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}`, {
        paymentStatus: "paid",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      // Note: Toast is handled by the caller (processPayment function)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsPaid = (bookingId: string) => {
    markAsPaidMutation.mutate(bookingId);
  };

  const handleCollectPayment = (bookingId: string) => {
    setSelectedBookingForPayment(bookingId);
    setPaymentType('card_on_file'); // Reset to default for new booking
    setIsPaymentDialogOpen(true);
  };

  const processPayment = () => {
    if (!selectedBookingForPayment) return;
    
    // Mark booking as paid (Stripe integration will be added later)
    markAsPaidMutation.mutate(selectedBookingForPayment, {
      onSuccess: () => {
        setIsPaymentDialogOpen(false);
        setSelectedBookingForPayment(null);
        toast({
          title: "Payment Collected",
          description: paymentType === 'card_on_file' 
            ? "Payment charged to card on file successfully"
            : "Payment processed successfully",
        });
      },
    });
  };

  // Top off mutation to extend booking time
  const topOffMutation = useMutation({
    mutationFn: async ({ bookingId, additionalMinutes, price }: { bookingId: string; additionalMinutes: number; price: number }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/top-off`, {
        additionalMinutes,
        price,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Time Added",
        description: `Successfully added ${topOffMinutes} minutes to the booking`,
      });
      setIsTopOffDialogOpen(false);
      setSelectedBookingForTopOff(null);
      setTopOffMinutes(30);
      setTopOffPrice("32.50");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add time to booking",
        variant: "destructive",
      });
    },
  });

  const handleTopOff = (bookingId: string) => {
    setSelectedBookingForTopOff(bookingId);
    setTopOffMinutes(30);
    setTopOffPrice("32.50");
    setIsTopOffDialogOpen(true);
  };

  const processTopOff = () => {
    if (!selectedBookingForTopOff) return;
    
    const price = parseFloat(topOffPrice);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price amount",
        variant: "destructive",
      });
      return;
    }

    topOffMutation.mutate({
      bookingId: selectedBookingForTopOff,
      additionalMinutes: topOffMinutes,
      price,
    });
  };

  const onSubmit = (data: BookingFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            Manage and track all bay bookings
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-booking">
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>

        {/* Create Booking Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Schedule a new bay booking
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Customer Selection */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Select Customer</Label>
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
                            : "Search existing customer..."}
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
                              {customers
                                .filter(c => {
                                  const searchLower = customerSearch.toLowerCase();
                                  const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                                  return fullName.includes(searchLower) || c.email?.toLowerCase().includes(searchLower);
                                })
                                .map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.id}
                                    onSelect={() => {
                                      setSelectedCustomer(customer);
                                      form.setValue('customerId', customer.id);
                                      setCustomerSearchOpen(false);
                                    }}
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            form.setValue('customerId', undefined);
                          }}
                          className="h-6 px-2"
                          data-testid="button-clear-customer"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {!selectedCustomer && (
                    <>
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-3">Or create new customer:</p>
                      </div>

                      <FormField
                        control={form.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter customer name"
                                {...field}
                                data-testid="input-guest-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="guestEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Email (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="customer@example.com"
                                {...field}
                                data-testid="input-guest-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="guestPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="(555) 123-4567"
                                {...field}
                                data-testid="input-guest-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rental">Sim Rental</SelectItem>
                          <SelectItem value="lesson">Lesson</SelectItem>
                          <SelectItem value="fitting">Club Fitting</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new_card">Paid Online</SelectItem>
                          <SelectItem value="membership">Member</SelectItem>
                          <SelectItem value="pay_at_desk">Pay At Desk</SelectItem>
                          <SelectItem value="card_on_file">Card on File</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-assign"
                    checked={useAutoAssign}
                    onCheckedChange={(checked) => setUseAutoAssign(checked as boolean)}
                    data-testid="checkbox-auto-assign"
                  />
                  <label
                    htmlFor="auto-assign"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Auto-assign best available bay
                  </label>
                </div>

                {!useAutoAssign && (
                  <FormField
                    control={form.control}
                    name="bayIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Bays</FormLabel>
                        <Select
                          value={field.value?.[0] || ""}
                          onValueChange={(value) => field.onChange([value])}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-bay">
                              <SelectValue placeholder="Choose a bay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bays?.map((bay) => (
                              <SelectItem key={bay.id} value={bay.id}>
                                {bay.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {useAutoAssign && (
                  <FormField
                    control={form.control}
                    name="numberOfBays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Bays</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-number-of-bays"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="referredBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred By (Optional)</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-referral">
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.firstName} {staff.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Booking"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bookings List */}
      {!bookings || bookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first booking to get started
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-booking">
            <Plus className="w-4 h-4 mr-2" />
            Create First Booking
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Current & Future Bookings */}
          {currentAndFutureBookings.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Current & Upcoming Bookings</h2>
                <Badge variant="secondary">{currentAndFutureBookings.length}</Badge>
              </div>
              <div className="space-y-3">
                {currentAndFutureBookings.map((booking) => (
              <div
                key={booking.id}
                className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-lg border hover-elevate"
                data-testid={`booking-item-${booking.id}`}
              >
                {/* Left side: Booking info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <div className="flex flex-wrap gap-1">
                        {booking.bays && booking.bays.length > 0 ? (
                          booking.bays.map((bay, idx) => (
                            <span key={bay?.id || idx} className="font-medium">
                              {bay?.name}{idx < booking.bays.length - 1 ? ',' : ''}
                            </span>
                          ))
                        ) : (
                          <span className="font-medium text-muted-foreground">No bays</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-mono">
                        {format(new Date(booking.startTime), "MMM d, h:mm a")} -{" "}
                        {format(new Date(booking.endTime), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserIcon className="w-4 h-4" />
                      {booking.user?.firstName} {booking.user?.lastName}
                    </div>
                  </div>

                  {/* Check-in status */}
                  <div className="flex items-center gap-2">
                    {booking.checkInStatus === 'checked_in' && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Checked In
                      </Badge>
                    )}
                    {booking.checkInStatus === 'no_show' && (
                      <Badge variant="default" className="bg-red-600 hover:bg-red-700 text-xs flex items-center gap-1">
                        <X className="w-3 h-3" />
                        No Show
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Right side: Dropdowns and actions */}
                <div className="flex items-center gap-3">
                  {/* Booking Type Dropdown */}
                  <div className="w-36">
                    <Select
                      value={booking.type}
                      onValueChange={(value) => updateTypeMutation.mutate({ id: booking.id, type: value })}
                      disabled={updateTypeMutation.isPending}
                    >
                      <SelectTrigger className="h-9 text-xs" data-testid={`select-type-${booking.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rental">Sim Rental</SelectItem>
                        <SelectItem value="lesson">Lesson</SelectItem>
                        <SelectItem value="fitting">Club Fitting</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method Dropdown */}
                  <div className="w-36">
                    <Select
                      value={booking.paymentMethod || "pay_at_desk"}
                      onValueChange={(value) => updatePaymentMethodMutation.mutate({ id: booking.id, paymentMethod: value })}
                      disabled={updatePaymentMethodMutation.isPending || booking.paymentStatus === 'paid'}
                    >
                      <SelectTrigger className="h-9 text-xs" data-testid={`select-payment-method-${booking.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_card">Paid Online</SelectItem>
                        <SelectItem value="membership">Member</SelectItem>
                        <SelectItem value="pay_at_desk">Pay At Desk</SelectItem>
                        <SelectItem value="card_on_file">Card on File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Status Badge */}
                  {booking.paymentStatus === 'paid' ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Pending
                    </Badge>
                  )}

                  {/* Payment Action Button */}
                  {booking.paymentStatus === 'pending' ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCollectPayment(booking.id)}
                      disabled={markAsPaidMutation.isPending}
                      data-testid={`button-collect-payment-${booking.id}`}
                    >
                      <CreditCard className="w-3 h-3 mr-1" />
                      Collect Payment
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      className="opacity-60 cursor-not-allowed"
                      data-testid={`button-payment-complete-${booking.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Payment Complete
                    </Button>
                  )}

                  {/* Top Off Time Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTopOff(booking.id)}
                    disabled={topOffMutation.isPending}
                    data-testid={`button-top-off-${booking.id}`}
                  >
                    <Timer className="w-3 h-3 mr-1" />
                    Top Off
                  </Button>

                  {/* Booking Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        data-testid={`button-booking-options-${booking.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Edit booking feature is under development",
                        });
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Booking
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Bill more feature is under development",
                        });
                      }}>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Bill More
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Refund feature is under development",
                          });
                        }}
                        className="text-amber-600"
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Refund
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Cancel booking feature is under development",
                          });
                        }}
                        className="text-destructive"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Cancel Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unpaid Past Bookings */}
          {unpaidPastBookings.length > 0 && (
            <Card className="p-6 border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Unpaid Past Bookings</h2>
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                    {unpaidPastBookings.length} Unpaid
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                {unpaidPastBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-lg border border-amber-500/30 hover-elevate opacity-75"
                    data-testid={`booking-item-${booking.id}`}
                  >
                    {/* Left side: Booking info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div className="flex flex-wrap gap-1">
                            {booking.bays && booking.bays.length > 0 ? (
                              booking.bays.map((bay, idx) => (
                                <span key={bay?.id || idx} className="font-medium">
                                  {bay?.name}{idx < booking.bays.length - 1 ? ',' : ''}
                                </span>
                              ))
                            ) : (
                              <span className="font-medium text-muted-foreground">No bays</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-mono">
                            {format(new Date(booking.startTime), "MMM d, h:mm a")} -{" "}
                            {format(new Date(booking.endTime), "h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UserIcon className="w-4 h-4" />
                          {booking.user?.firstName} {booking.user?.lastName}
                        </div>
                      </div>

                      {/* Check-in status */}
                      <div className="flex items-center gap-2">
                        {booking.checkInStatus === 'checked_in' && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Checked In
                          </Badge>
                        )}
                        {booking.checkInStatus === 'no_show' && (
                          <Badge variant="default" className="bg-red-600 hover:bg-red-700 text-xs flex items-center gap-1">
                            <X className="w-3 h-3" />
                            No Show
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right side: Dropdowns and actions */}
                    <div className="flex items-center gap-3">
                      {/* Booking Type Dropdown */}
                      <div className="w-36">
                        <Select
                          value={booking.type}
                          onValueChange={(value) => updateTypeMutation.mutate({ id: booking.id, type: value })}
                          disabled={updateTypeMutation.isPending}
                        >
                          <SelectTrigger className="h-9 text-xs" data-testid={`select-type-${booking.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rental">Sim Rental</SelectItem>
                            <SelectItem value="lesson">Lesson</SelectItem>
                            <SelectItem value="fitting">Club Fitting</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Payment Method Dropdown */}
                      <div className="w-36">
                        <Select
                          value={booking.paymentMethod || "pay_at_desk"}
                          onValueChange={(value) => updatePaymentMethodMutation.mutate({ id: booking.id, paymentMethod: value })}
                          disabled={updatePaymentMethodMutation.isPending || booking.paymentStatus === 'paid'}
                        >
                          <SelectTrigger className="h-9 text-xs" data-testid={`select-payment-method-${booking.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new_card">Paid Online</SelectItem>
                            <SelectItem value="membership">Member</SelectItem>
                            <SelectItem value="pay_at_desk">Pay At Desk</SelectItem>
                            <SelectItem value="card_on_file">Card on File</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Payment Status Badge - Always Pending for this section */}
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Unpaid
                      </Badge>

                      {/* Payment Action Button */}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleCollectPayment(booking.id)}
                        disabled={markAsPaidMutation.isPending}
                        data-testid={`button-collect-payment-${booking.id}`}
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        Collect Payment
                      </Button>

                      {/* Booking Options Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0"
                            data-testid={`button-booking-options-${booking.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Edit booking feature is under development",
                            });
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Booking
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Bill more feature is under development",
                            });
                          }}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Bill More
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              toast({
                                title: "Coming Soon",
                                description: "Refund feature is under development",
                              });
                            }}
                            className="text-amber-600"
                          >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Refund
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              toast({
                                title: "Coming Soon",
                                description: "Cancel booking feature is under development",
                              });
                            }}
                            className="text-destructive"
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Cancel Booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Archived Bookings (Paid Past Bookings) */}
          {archivedBookings.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Archived Bookings</h2>
                  <Badge variant="secondary">{archivedBookings.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchivedBookings(!showArchivedBookings)}
                  data-testid="button-toggle-archived"
                >
                  {showArchivedBookings ? 'Hide' : 'Show'} Archived
                </Button>
              </div>
              
              {showArchivedBookings && (
                <div className="space-y-3">
                  {archivedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-lg border hover-elevate opacity-60"
                      data-testid={`booking-item-${booking.id}`}
                    >
                      {/* Left side: Booking info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <div className="flex flex-wrap gap-1">
                              {booking.bays && booking.bays.length > 0 ? (
                                booking.bays.map((bay, idx) => (
                                  <span key={bay?.id || idx} className="font-medium">
                                    {bay?.name}{idx < booking.bays.length - 1 ? ',' : ''}
                                  </span>
                                ))
                              ) : (
                                <span className="font-medium text-muted-foreground">No bays</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-mono">
                              {format(new Date(booking.startTime), "MMM d, h:mm a")} -{" "}
                              {format(new Date(booking.endTime), "h:mm a")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <UserIcon className="w-4 h-4" />
                            {booking.user?.firstName} {booking.user?.lastName}
                          </div>
                        </div>

                        {/* Check-in status */}
                        <div className="flex items-center gap-2">
                          {booking.checkInStatus === 'checked_in' && (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Checked In
                            </Badge>
                          )}
                          {booking.checkInStatus === 'no_show' && (
                            <Badge variant="default" className="bg-red-600 hover:bg-red-700 text-xs flex items-center gap-1">
                              <X className="w-3 h-3" />
                              No Show
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right side: Type and Payment Status */}
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{BOOKING_TYPE_LABELS[booking.type]}</Badge>
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Payment Collection Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-collect-payment">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Choose how to process payment for this booking
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedBookingForPayment && (() => {
              const selectedBooking = bookings?.find(b => b.id === selectedBookingForPayment);
              if (!selectedBooking) return null;

              // Calculate duration
              const duration = (new Date(selectedBooking.endTime).getTime() - new Date(selectedBooking.startTime).getTime()) / 60000;
              const hours = Math.floor(duration / 60);
              const minutes = duration % 60;
              const durationStr = hours > 0 
                ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
                : `${minutes}m`;

              // Format amount with proper currency formatting
              const amount = selectedBooking.amount ? parseFloat(selectedBooking.amount) : 0;
              const formattedAmount = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(amount);

              return (
                <>
                  {/* Payment Review Summary */}
                  <Card className="p-4 bg-muted/30">
                    <h3 className="font-semibold mb-3">Payment Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Customer</span>
                        <span className="text-sm font-medium">
                          {selectedBooking.user?.firstName} {selectedBooking.user?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Booking Type</span>
                        <span className="text-sm font-medium">
                          {BOOKING_TYPE_LABELS[selectedBooking.type]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Date & Time</span>
                        <span className="text-sm font-mono">
                          {format(new Date(selectedBooking.startTime), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm font-medium">{durationStr}</span>
                      </div>
                      {selectedBooking.bays && selectedBooking.bays.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Bay(s)</span>
                          <span className="text-sm font-medium">
                            {selectedBooking.bays.map(bay => bay?.name).join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="pt-3 mt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">Total Amount</span>
                          <span className="text-lg font-bold text-primary" data-testid="text-payment-amount">
                            {formattedAmount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="grid gap-2">
                    <button
                      onClick={() => setPaymentType('card_on_file')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors hover-elevate ${
                        paymentType === 'card_on_file'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                      data-testid="option-card-on-file"
                    >
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium mb-1">Charge Card on File</div>
                          <div className="text-sm text-muted-foreground">
                            Process payment using customer's saved card
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentType('new_card')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors hover-elevate ${
                        paymentType === 'new_card'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                      data-testid="option-new-card"
                    >
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium mb-1">Enter New Card / POS</div>
                          <div className="text-sm text-muted-foreground">
                            Manually enter card details or use POS terminal
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Stripe Integration Notice */}
                <Card className="p-3 border-amber-500/20 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Stripe integration for automated payment processing will be available soon. For now, clicking "Process Payment" will mark the booking as paid.
                    </p>
                  </div>
                </Card>
              </>
              );
            })()}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setSelectedBookingForPayment(null);
              }}
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={processPayment}
              disabled={markAsPaidMutation.isPending}
              data-testid="button-process-payment"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {markAsPaidMutation.isPending ? "Processing..." : "Process Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Off Time Dialog */}
      <Dialog open={isTopOffDialogOpen} onOpenChange={setIsTopOffDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-top-off">
          <DialogHeader>
            <DialogTitle>Add Time to Booking</DialogTitle>
            <DialogDescription>
              Extend the booking duration and charge for additional time
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedBookingForTopOff && bookings?.find(b => b.id === selectedBookingForTopOff) && (
              <>
                {/* Booking Summary */}
                <Card className="p-4 bg-muted/30">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current End Time</span>
                      <span className="text-sm font-mono">
                        {format(
                          new Date(bookings.find(b => b.id === selectedBookingForTopOff)!.endTime),
                          "MMM d, h:mm a"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Customer</span>
                      <span className="text-sm font-medium">
                        {bookings.find(b => b.id === selectedBookingForTopOff)!.user?.firstName}{" "}
                        {bookings.find(b => b.id === selectedBookingForTopOff)!.user?.lastName}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Time Selection */}
                <div className="space-y-2">
                  <Label htmlFor="time-increment">Additional Time</Label>
                  <Select
                    value={topOffMinutes.toString()}
                    onValueChange={(value) => setTopOffMinutes(parseInt(value))}
                  >
                    <SelectTrigger id="time-increment" data-testid="select-time-increment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="150">2.5 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Input */}
                <div className="space-y-2">
                  <Label htmlFor="top-off-price">Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="top-off-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={topOffPrice}
                      onChange={(e) => setTopOffPrice(e.target.value)}
                      className="pl-9"
                      placeholder="32.50"
                      data-testid="input-top-off-price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default: $32.50 per 30 minutes
                  </p>
                </div>

                {/* New End Time Preview */}
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">New End Time</span>
                    <span className="text-sm font-mono text-primary">
                      {format(
                        new Date(
                          new Date(bookings.find(b => b.id === selectedBookingForTopOff)!.endTime).getTime() + 
                          topOffMinutes * 60000
                        ),
                        "MMM d, h:mm a"
                      )}
                    </span>
                  </div>
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTopOffDialogOpen(false);
                setSelectedBookingForTopOff(null);
                setTopOffMinutes(30);
                setTopOffPrice("32.50");
              }}
              data-testid="button-cancel-top-off"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={processTopOff}
              disabled={topOffMutation.isPending}
              data-testid="button-confirm-top-off"
            >
              <Timer className="w-4 h-4 mr-2" />
              {topOffMutation.isPending ? "Adding Time..." : "Add Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
