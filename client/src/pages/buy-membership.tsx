import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface MembershipTierData {
  membershipTier: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    hoursIncluded: number | null;
    allowedBayTiers: string[] | null;
   };
  facility: {
    id: string;
    name: string;
    logo: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  };
}

const customerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function BuyMembership() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isPurchased, setIsPurchased] = useState(false);

  const { data, isLoading, error } = useQuery<MembershipTierData>({
    queryKey: [`/api/public/membership/${id}`],
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      // For now, just create a user account (Stripe integration deferred)
      const response = await apiRequest("/api/auth/register-customer", {
        method: "POST",
        body: JSON.stringify({
          ...customerData,
          facilityId: data?.facility.id,
          membershipTierId: id,
        }),
      });
      return response;
    },
    onSuccess: () => {
      setIsPurchased(true);
      toast({
        title: "Success!",
        description: "Your membership purchase is complete. Check your email for next steps.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error.message || "Unable to complete purchase. Please try again.",
      });
    },
  });

  const onSubmit = (formData: CustomerFormData) => {
    purchaseMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-error-title">Error Loading Membership</CardTitle>
            <CardDescription data-testid="text-error-message">
              {error.message || "Unable to load membership details. Please try again later."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-not-found-title">Membership Not Found</CardTitle>
            <CardDescription data-testid="text-not-found-message">
              The membership tier you're looking for doesn't exist or is no longer available.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { membershipTier, facility } = data;

  if (isPurchased) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" data-testid="icon-success" />
            </div>
            <CardTitle data-testid="text-success-title">Purchase Complete!</CardTitle>
            <CardDescription data-testid="text-success-message">
              Welcome to {facility.name}! Check your email for next steps to activate your membership.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl py-8">
        {/* Facility Branding */}
        {facility.logo && (
          <div className="mb-8 text-center">
            <img src={facility.logo} alt={facility.name} className="mx-auto h-16 object-contain" data-testid="img-facility-logo" />
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Membership Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl" data-testid="text-membership-name">{membershipTier.name}</CardTitle>
              {membershipTier.description && (
                <CardDescription className="text-base" data-testid="text-membership-description">{membershipTier.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary" data-testid="text-membership-price">
                  ${parseFloat(membershipTier.price).toFixed(2)}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <div className="space-y-3 pt-4">
                {membershipTier.hoursIncluded && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span data-testid="text-hours-included">{membershipTier.hoursIncluded} hours of bay time included</span>
                  </div>
                )}
                {membershipTier.allowedBayTiers && membershipTier.allowedBayTiers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span data-testid="text-allowed-bay-tiers">
                      Access to {membershipTier.allowedBayTiers.join(", ")} bays
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2" data-testid="feature-simulator-technology">
                  <Check className="h-5 w-5 text-primary" />
                  <span>State-of-the-art golf simulator technology</span>
                </div>
                <div className="flex items-center gap-2" data-testid="feature-online-booking">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Easy online booking</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground pt-4 border-t" data-testid="text-facility-name">
                Membership at <strong>{facility.name}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Customer Sign-up Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sign Up Now</CardTitle>
              <CardDescription>Enter your details to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              data-testid="input-first-name"
                              {...field}
                            />
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
                            <Input
                              placeholder="Smith"
                              data-testid="input-last-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(555) 123-4567"
                            data-testid="input-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={purchaseMutation.isPending}
                      data-testid="button-purchase"
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Complete Purchase"
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    By signing up, you agree to our terms of service and privacy policy.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
