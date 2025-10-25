import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Calendar, Dumbbell, Award, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface TransformationPackageData {
  package: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    billingFrequency: string;
    durationMonths: number;
    includeLessons: boolean;
    totalLessons: number | null;
    lessonDurationMinutes: number | null;
    lessonsPerWeek: number | null;
    includeClubFitting: boolean;
    clubFittingSessions: number | null;
    includeBayAccess: boolean;
    bayAccessHours: number | null;
    bayAccessPerWeek: number | null;
    includeOnCoursePractice: boolean;
    onCoursePracticeSessions: number | null;
    features: string[] | null;
    maxEnrollments: number | null;
    currentEnrollments: number | null;
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

export default function BuyTransformationPackage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isPurchased, setIsPurchased] = useState(false);

  const { data, isLoading, error } = useQuery<TransformationPackageData>({
    queryKey: [`/api/public/transformation-package/${id}`],
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
          transformationPackageId: id,
        }),
      });
      return response;
    },
    onSuccess: () => {
      setIsPurchased(true);
      toast({
        title: "Success!",
        description: "Your transformation package purchase is complete. Check your email for next steps.",
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
            <CardTitle data-testid="text-error-title">Error Loading Package</CardTitle>
            <CardDescription data-testid="text-error-message">
              {error.message || "Unable to load transformation package details. Please try again later."}
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
            <CardTitle data-testid="text-not-found-title">Package Not Found</CardTitle>
            <CardDescription data-testid="text-not-found-message">
              The transformation package you're looking for doesn't exist or is no longer available.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { package: pkg, facility } = data;

  // Check if package is full
  const isFull = pkg.maxEnrollments && pkg.currentEnrollments && pkg.currentEnrollments >= pkg.maxEnrollments;

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
              Welcome to {facility.name}'s {pkg.name}! Check your email for next steps to get started on your golf transformation journey.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const billingLabel = pkg.billingFrequency === "one_time" 
    ? "One-Time" 
    : `/${pkg.billingFrequency}`;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-5xl py-8">
        {/* Facility Branding */}
        {facility.logo && (
          <div className="mb-8 text-center">
            <img src={facility.logo} alt={facility.name} className="mx-auto h-16 object-contain" data-testid="img-facility-logo" />
          </div>
        )}
        
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Package Details */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-3xl mb-2" data-testid="text-package-name">{pkg.name}</CardTitle>
                    <div className="text-muted-foreground font-medium mb-2" data-testid="text-package-duration">
                      {pkg.durationMonths} Month{pkg.durationMonths > 1 ? "s" : ""} Program
                    </div>
                    {pkg.description && (
                      <CardDescription className="text-base mt-3" data-testid="text-package-description">{pkg.description}</CardDescription>
                    )}
                  </div>
                  <div className="px-3 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap" data-testid="badge-billing-frequency">
                    {pkg.billingFrequency.replace("_", " ").toUpperCase()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-baseline gap-2 pb-6 border-b">
                  <span className="text-5xl font-bold text-primary" data-testid="text-package-price">
                    ${parseFloat(pkg.price).toFixed(2)}
                  </span>
                  {pkg.billingFrequency !== "one_time" && (
                    <span className="text-muted-foreground text-lg">/{pkg.billingFrequency}</span>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">What's Included</h3>
                  
                  <div className="space-y-3">
                    {pkg.includeLessons && pkg.totalLessons && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium" data-testid="text-lessons-total">
                            {pkg.totalLessons} Private Lesson{pkg.totalLessons > 1 ? "s" : ""}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {pkg.lessonDurationMinutes} minutes each
                            {pkg.lessonsPerWeek && pkg.lessonsPerWeek > 0 && ` • ${pkg.lessonsPerWeek} per week`}
                          </div>
                        </div>
                      </div>
                    )}

                    {pkg.includeClubFitting && pkg.clubFittingSessions && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Dumbbell className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium" data-testid="text-fitting-sessions">
                            {pkg.clubFittingSessions} Professional Club Fitting Session{pkg.clubFittingSessions > 1 ? "s" : ""}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Personalized equipment analysis and recommendations
                          </div>
                        </div>
                      </div>
                    )}

                    {pkg.includeBayAccess && pkg.bayAccessHours && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium" data-testid="text-bay-access-hours">
                            {pkg.bayAccessHours} Hours of Bay Access
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Practice time on our state-of-the-art simulators
                            {pkg.bayAccessPerWeek && pkg.bayAccessPerWeek > 0 && ` • ${pkg.bayAccessPerWeek} hours per week`}
                          </div>
                        </div>
                      </div>
                    )}

                    {pkg.includeOnCoursePractice && pkg.onCoursePracticeSessions && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium" data-testid="text-on-course-sessions">
                            {pkg.onCoursePracticeSessions} On-Course Practice Session{pkg.onCoursePracticeSessions > 1 ? "s" : ""}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Apply what you've learned on a real course
                          </div>
                        </div>
                      </div>
                    )}

                    {pkg.features && pkg.features.length > 0 && pkg.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2" data-testid={`feature-${idx}`}>
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  {pkg.maxEnrollments && (
                    <p className="text-sm text-muted-foreground" data-testid="text-enrollment-status">
                      <strong>{pkg.currentEnrollments || 0}</strong> of <strong>{pkg.maxEnrollments}</strong> spots filled
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground" data-testid="text-facility-name">
                    Program offered by <strong>{facility.name}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Sign-up Form */}
          <div className="lg:col-span-2">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Enroll Now</CardTitle>
                <CardDescription>
                  {isFull 
                    ? "This program is currently full. Join our waitlist to be notified when spots open up."
                    : "Start your transformation journey today"
                  }
                </CardDescription>
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
                        disabled={purchaseMutation.isPending || isFull}
                        data-testid="button-purchase"
                      >
                        {purchaseMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : isFull ? (
                          "Join Waitlist"
                        ) : (
                          "Enroll Now"
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center pt-2">
                      By enrolling, you agree to our terms of service and privacy policy.
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
