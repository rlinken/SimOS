import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Check, Building2, Map, Settings, Users, Plus, X } from "lucide-react";
import { z } from "zod";
import { useLocation } from "wouter";

const onboardingSchema = z.object({
  // Step 1: Basic Info
  name: z.string().min(2, "Facility name is required"),
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
  logo: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  
  // Step 2: Bays (handled separately in state)
  
  // Step 3: Services
  lessonsEnabled: z.boolean(),
  fittingsEnabled: z.boolean(),
  
  // Step 4: Membership Tiers (handled separately in state)
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface BayConfig {
  name: string;
  tier: "standard" | "premium" | "vip";
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: Building2, description: "Tell us about your facility" },
  { id: 2, title: "Bay Setup", icon: Map, description: "Configure your simulator bays" },
  { id: 3, title: "Services", icon: Settings, description: "Choose what you offer" },
  { id: 4, title: "Memberships", icon: Users, description: "Create membership tiers" },
];

interface MembershipTier {
  name: string;
  tierLevel: number;
  monthlyPrice: string;
  hourlyRate: string;
  monthlyHours: number;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [bays, setBays] = useState<BayConfig[]>([
    { name: "Bay 1", tier: "standard" },
    { name: "Bay 2", tier: "standard" },
    { name: "Bay 3", tier: "standard" },
    { name: "Bay 4", tier: "standard" },
  ]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([
    { name: "Bronze", tierLevel: 1, monthlyPrice: "99", hourlyRate: "25", monthlyHours: 4 },
    { name: "Silver", tierLevel: 2, monthlyPrice: "199", hourlyRate: "20", monthlyHours: 10 },
    { name: "Gold", tierLevel: 3, monthlyPrice: "299", hourlyRate: "15", monthlyHours: 20 },
  ]);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      logo: "",
      address: "",
      phone: "",
      email: "",
      lessonsEnabled: true,
      fittingsEnabled: true,
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (data: OnboardingFormData & { bays: BayConfig[]; membershipTiers: MembershipTier[] }) => {
      return apiRequest("POST", "/api/onboarding/complete", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your facility has been set up. Redirecting to dashboard...",
      });
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    
    if (isValid) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const formData = form.getValues();
    
    // Parse membership tier numeric fields
    const parsedMembershipTiers = membershipTiers.map(tier => ({
      ...tier,
      monthlyPrice: parseFloat(tier.monthlyPrice) || 0,
      hourlyRate: parseFloat(tier.hourlyRate) || 0,
      monthlyHours: parseInt(String(tier.monthlyHours)) || 0,
    }));
    
    completeMutation.mutate({
      ...formData,
      bays,
      membershipTiers: parsedMembershipTiers,
    });
  };

  const getFieldsForStep = (step: number): (keyof OnboardingFormData)[] => {
    switch (step) {
      case 1:
        return ["name", "subdomain"];
      case 2:
        return [];
      case 3:
        return ["lessonsEnabled", "fittingsEnabled"];
      case 4:
        return [];
      default:
        return [];
    }
  };

  const addBay = () => {
    setBays([...bays, { name: `Bay ${bays.length + 1}`, tier: "standard" }]);
  };

  const removeBay = (index: number) => {
    if (bays.length > 1) {
      setBays(bays.filter((_, i) => i !== index));
    }
  };

  const updateBay = (index: number, field: keyof BayConfig, value: any) => {
    const updated = [...bays];
    updated[index] = { ...updated[index], [field]: value };
    setBays(updated);
  };

  const updateMembershipTier = (index: number, field: keyof MembershipTier, value: any) => {
    const updated = [...membershipTiers];
    updated[index] = { ...updated[index], [field]: value };
    setMembershipTiers(updated);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-onboarding-title">
            Welcome to GolfSimOS
          </h1>
          <p className="text-muted-foreground">
            Let's get your facility set up in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${step.id}`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 w-full mx-4 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., TopGolf Training Center"
                          data-testid="input-facility-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain *</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            {...field}
                            placeholder="topgolf"
                            data-testid="input-subdomain"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            .golfsimos.com
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        This will be your unique URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com/logo.png"
                          data-testid="input-logo"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a URL to your facility's logo image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="123 Golf Lane, City, State 12345"
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
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
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="info@facility.com"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Bay Setup */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Configure Your Bays</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up each bay with a name and tier
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBay}
                    data-testid="button-add-bay"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bay
                  </Button>
                </div>
                <div className="space-y-3">
                  {bays.map((bay, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Bay Name
                            </label>
                            <Input
                              value={bay.name}
                              onChange={(e) => updateBay(index, "name", e.target.value)}
                              data-testid={`input-bay-name-${index}`}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Tier
                            </label>
                            <Select
                              value={bay.tier}
                              onValueChange={(value) => updateBay(index, "tier", value)}
                            >
                              <SelectTrigger data-testid={`select-bay-tier-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="vip">VIP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {bays.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBay(index)}
                            data-testid={`button-remove-bay-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Services */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">What services do you offer?</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="lessonsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-md">
                          <div>
                            <FormLabel>Golf Lessons</FormLabel>
                            <FormDescription>
                              Enable instructor-led golf lessons
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-lessons"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fittingsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-md">
                          <div>
                            <FormLabel>Club Fittings</FormLabel>
                            <FormDescription>
                              Enable club fitting services
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-fittings"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Membership Tiers */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Membership Tiers</h3>
                  <p className="text-sm text-muted-foreground">
                    We've created 3 starter tiers for you. Customize or add more later.
                  </p>
                </div>
                <div className="space-y-4">
                  {membershipTiers.map((tier, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Tier Name</label>
                          <Input
                            value={tier.name}
                            onChange={(e) => updateMembershipTier(index, "name", e.target.value)}
                            data-testid={`input-tier-name-${index}`}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Monthly Price</label>
                          <div className="flex items-center gap-2">
                            <span>$</span>
                            <Input
                              type="number"
                              value={tier.monthlyPrice}
                              onChange={(e) => updateMembershipTier(index, "monthlyPrice", e.target.value)}
                              data-testid={`input-tier-price-${index}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Hourly Rate</label>
                          <div className="flex items-center gap-2">
                            <span>$</span>
                            <Input
                              type="number"
                              value={tier.hourlyRate}
                              onChange={(e) => updateMembershipTier(index, "hourlyRate", e.target.value)}
                              data-testid={`input-tier-hourly-${index}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Monthly Hours</label>
                          <Input
                            type="number"
                            value={tier.monthlyHours}
                            onChange={(e) => updateMembershipTier(index, "monthlyHours", parseInt(e.target.value))}
                            data-testid={`input-tier-hours-${index}`}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  data-testid="button-complete"
                >
                  {completeMutation.isPending ? "Setting up..." : "Complete Setup"}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
