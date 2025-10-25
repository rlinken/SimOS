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
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Plus, Clock, MapPin, Sparkles, DollarSign, CheckCircle2, X } from "lucide-react";
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

export default function BookingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useAutoAssign, setUseAutoAssign] = useState(true);
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-primary/10 text-primary";
      case "pending":
        return "bg-chart-4/10 text-chart-4";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Bookings</h1>
        </div>
        <Card className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Bookings
          </h1>
          <p className="text-muted-foreground">
            Manage bay reservations and schedules
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-booking">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Booking</DialogTitle>
              <DialogDescription>
                Schedule a new bay reservation
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-assign"
                      checked={useAutoAssign}
                      onCheckedChange={(checked) => {
                        setUseAutoAssign(!!checked);
                        if (checked) {
                          form.setValue("bayIds", []);
                        } else {
                          form.setValue("numberOfBays", 1);
                        }
                      }}
                      data-testid="checkbox-auto-assign"
                    />
                    <label
                      htmlFor="auto-assign"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-assign bays (recommended)
                    </label>
                  </div>

                  {useAutoAssign ? (
                    <FormField
                      control={form.control}
                      name="numberOfBays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Bays</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max={bays?.filter(b => b.status === "active").length || 10}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              data-testid="input-number-of-bays"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            System will auto-assign {field.value} bay{field.value !== 1 ? 's' : ''} with lowest usage
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="bayIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Bays (Manual)</FormLabel>
                          <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                            {bays?.filter(b => b.status === "active").map((bay) => (
                              <div key={bay.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`bay-${bay.id}`}
                                  checked={field.value?.includes(bay.id) || false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, bay.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== bay.id));
                                    }
                                  }}
                                  data-testid={`checkbox-bay-${bay.id}`}
                                />
                                <label
                                  htmlFor={`bay-${bay.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between flex-1 cursor-pointer"
                                >
                                  <span>{bay.name}</span>
                                  <span className="text-xs text-muted-foreground capitalize">{bay.tier}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {field.value && field.value.length > 0
                              ? `${field.value.length} bay${field.value.length !== 1 ? 's' : ''} selected`
                              : "Select at least one bay"}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            data-testid="input-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="time"
                            data-testid="input-start-time"
                          />
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
                          <Input
                            {...field}
                            type="time"
                            data-testid="input-end-time"
                          />
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
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rental">Rental</SelectItem>
                          <SelectItem value="lesson">Lesson</SelectItem>
                          <SelectItem value="fitting">Fitting</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referredBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred By (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-referred-by">
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
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
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                data-testid={`booking-item-${booking.id}`}
              >
                <div className="flex items-center gap-4">
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
                  <div className="text-sm text-muted-foreground">
                    {booking.user?.firstName} {booking.user?.lastName}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">
                    {booking.type}
                  </Badge>
                  {booking.paymentMethod === 'pay_at_desk' && booking.paymentStatus !== 'paid' && (
                    <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      PAY AT DESK
                    </Badge>
                  )}
                  {booking.paymentMethod && booking.paymentMethod !== 'pay_at_desk' && (
                    <Badge variant="secondary" className="capitalize text-xs">
                      {booking.paymentMethod.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  <Badge
                    variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {booking.paymentStatus}
                  </Badge>
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
                  {booking.checkInStatus === 'pending' && (
                    <Badge variant="secondary" className="text-xs">
                      Not Checked In
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
