import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  CreditCard, 
  Receipt, 
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Booking, User as UserType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type EnrichedBooking = Booking & {
  bay?: any;
  offering?: any;
};

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const { data: bookings = [] } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: membershipTier } = useQuery<any>({
    queryKey: ["/api/membership-tiers", user?.membershipTierId],
    enabled: !!user?.membershipTierId,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest(`/api/users/${user?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setEditProfileOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Sort bookings by date (newest first)
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Separate into upcoming and past
  const now = new Date();
  const upcomingBookings = sortedBookings.filter(b => new Date(b.startTime) > now);
  const pastBookings = sortedBookings.filter(b => new Date(b.startTime) <= now);

  const getBookingColor = (type: string) => {
    switch (type) {
      case "rental":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "lesson":
        return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "fitting":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      default:
        return "";
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

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "refunded":
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-account">
          Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your profile, payment methods, and view your booking history
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-booking-history">
            <Receipt className="w-4 h-4 mr-2" />
            Booking History
          </TabsTrigger>
          <TabsTrigger value="payment" data-testid="tab-payment">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment Methods
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <Button
                variant="outline"
                onClick={() => setEditProfileOpen(true)}
                data-testid="button-edit-profile"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">First Name</Label>
                  <p className="text-lg" data-testid="text-first-name">{user?.firstName || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Name</Label>
                  <p className="text-lg" data-testid="text-last-name">{user?.lastName || "Not set"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-lg" data-testid="text-email">{user?.email}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="text-lg" data-testid="text-phone">{user?.phone || "Not set"}</p>
              </div>

              {membershipTier && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Membership</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" data-testid="badge-membership-tier">
                        {membershipTier.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ${membershipTier.monthlyPrice}/month
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>
            {upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming bookings</p>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id} className="p-4" data-testid={`upcoming-booking-${booking.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getBookingColor(booking.type)}>
                            {getTypeLabel(booking.type)}
                          </Badge>
                          {getPaymentStatusBadge(booking.paymentStatus)}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{format(parseISO(booking.startTime as any), "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {format(parseISO(booking.startTime as any), "h:mm a")} -{" "}
                              {format(parseISO(booking.endTime as any), "h:mm a")}
                            </span>
                          </div>
                        </div>
                        {booking.bay && (
                          <p className="text-sm text-muted-foreground">Bay: {booking.bay.name}</p>
                        )}
                      </div>
                      {booking.amount && (
                        <div className="text-right">
                          <p className="text-lg font-semibold" data-testid={`amount-${booking.id}`}>
                            ${parseFloat(booking.amount).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Past Bookings</h2>
            {pastBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No past bookings</p>
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <Card key={booking.id} className="p-4 opacity-75" data-testid={`past-booking-${booking.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getTypeLabel(booking.type)}
                          </Badge>
                          {getPaymentStatusBadge(booking.paymentStatus)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{format(parseISO(booking.startTime as any), "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(parseISO(booking.startTime as any), "h:mm a")} -{" "}
                              {format(parseISO(booking.endTime as any), "h:mm a")}
                            </span>
                          </div>
                        </div>
                        {booking.bay && (
                          <p className="text-sm text-muted-foreground">Bay: {booking.bay.name}</p>
                        )}
                      </div>
                      {booking.amount && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-muted-foreground" data-testid={`amount-${booking.id}`}>
                            ${parseFloat(booking.amount).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Payment Methods</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your saved payment methods
                </p>
              </div>
              <Button data-testid="button-add-payment-method" disabled>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>

            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Payment Integration Pending</h3>
              <p className="text-muted-foreground mb-4">
                Stripe payment integration will be added soon. You'll be able to securely save<br />
                and manage your payment methods here.
              </p>
              <p className="text-xs text-muted-foreground">
                For now, payments will be processed at the facility
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent data-testid="dialog-edit-profile">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="(555) 123-4567"
                        data-testid="input-phone"
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
                  onClick={() => setEditProfileOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
