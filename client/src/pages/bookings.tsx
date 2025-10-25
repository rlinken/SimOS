import { useState } from "react";
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
import { Calendar, Plus, Clock, MapPin, DollarSign, CheckCircle2, X, CreditCard, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<(Booking & { bays: Bay[]; user: User })[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: bays } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  const { data: staffMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/staff"],
  });

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
      return apiRequest("PATCH", `/api/bookings/${id}`, { paymentMethod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Updated",
        description: "Payment method updated successfully",
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
      toast({
        title: "Success",
        description: "Booking marked as paid",
      });
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
    setIsPaymentDialogOpen(true);
  };

  const processPayment = () => {
    if (!selectedBookingForPayment) return;
    
    // For now, just mark as paid - real Stripe integration coming soon
    toast({
      title: "Payment Processing",
      description: "Stripe integration coming soon. Please use 'Mark as Paid' for manual payments.",
    });
    setIsPaymentDialogOpen(false);
    setSelectedBookingForPayment(null);
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
        <Card className="p-6">
          <div className="space-y-3">
            {bookings.map((booking) => (
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
                  {booking.paymentStatus === 'pending' && (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
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
            {selectedBookingForPayment && bookings?.find(b => b.id === selectedBookingForPayment) && (
              <>
                {/* Booking Summary */}
                <Card className="p-4 bg-muted/30">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Booking</span>
                      <span className="text-sm font-mono">
                        {format(
                          new Date(bookings.find(b => b.id === selectedBookingForPayment)!.startTime),
                          "MMM d, h:mm a"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Customer</span>
                      <span className="text-sm font-medium">
                        {bookings.find(b => b.id === selectedBookingForPayment)!.user?.firstName}{" "}
                        {bookings.find(b => b.id === selectedBookingForPayment)!.user?.lastName}
                      </span>
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
                <Card className="p-4 border-amber-500/20 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                        Payment Processing Coming Soon
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                        Stripe integration for automated payment processing will be available soon.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleMarkAsPaid(selectedBookingForPayment);
                          setIsPaymentDialogOpen(false);
                          setSelectedBookingForPayment(null);
                        }}
                        data-testid="button-mark-paid-dialog"
                      >
                        Mark as Paid (Manual)
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
