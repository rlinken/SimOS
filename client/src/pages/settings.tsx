import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings as SettingsIcon, Copy, ExternalLink, Code, Calendar, CreditCard } from "lucide-react";

type TimeUnit = "minutes" | "hours" | "days";

// Helper functions to convert between units
const convertToMinutes = (value: number, unit: TimeUnit): number => {
  switch (unit) {
    case "hours": return value * 60;
    case "days": return value * 60 * 24;
    default: return value;
  }
};

const convertFromMinutes = (minutes: number, unit: TimeUnit): number => {
  switch (unit) {
    case "hours": return Math.round(minutes / 60);
    case "days": return Math.round(minutes / (60 * 24));
    default: return minutes;
  }
};

// Smart unit detection based on value
const detectBestUnit = (minutes: number): TimeUnit => {
  if (minutes >= 1440 && minutes % 1440 === 0) return "days";
  if (minutes >= 60 && minutes % 60 === 0) return "hours";
  return "minutes";
};

// Reusable TimeInput component
function TimeInput({
  label,
  description,
  value,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (minutes: number) => void;
  disabled: boolean;
  testId: string;
}) {
  const [unit, setUnit] = useState<TimeUnit>(() => detectBestUnit(value));
  const displayValue = convertFromMinutes(value, unit);

  const handleValueChange = (newValue: string) => {
    const num = parseInt(newValue) || 0;
    onChange(convertToMinutes(num, unit));
  };

  const handleUnitChange = (newUnit: TimeUnit) => {
    setUnit(newUnit);
    // Convert current value to new unit, then back to minutes to preserve the time
    const currentDisplayValue = convertFromMinutes(value, unit);
    onChange(convertToMinutes(currentDisplayValue, newUnit));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={testId}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={testId}
          type="number"
          min="0"
          value={displayValue}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled}
          data-testid={testId}
          className="flex-1"
        />
        <Select value={unit} onValueChange={handleUnitChange} disabled={disabled}>
          <SelectTrigger className="w-32" data-testid={`${testId}-unit`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState("stripe");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  const facilityId = user?.facilityId || "";

  const { data: facility, isLoading } = useQuery<any>({
    queryKey: ["/api/facility"],
    enabled: !!facilityId,
  });

  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = useQuery<any>({
    queryKey: ["/api/payment-settings"],
    enabled: !!facilityId,
  });

  useEffect(() => {
    if (paymentSettings) {
      setPaymentProvider(paymentSettings.paymentProvider || "stripe");
      setStripePublishableKey(paymentSettings.stripePublishableKey || "");
      // Don't set stripeSecretKey to masked value - keep it empty if key exists
      // User must enter a new key to update it
      setStripeSecretKey("");
      setPaymentsEnabled(paymentSettings.paymentsEnabled || false);
    }
  }, [paymentSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PATCH", `/api/facility`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility"] });
      toast({
        title: "Settings Updated",
        description: "Your facility settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePaymentSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PATCH", `/api/payment-settings`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-settings"] });
      toast({
        title: "Payment Settings Updated",
        description: "Your payment settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payment settings. Please try again.",
        variant: "destructive",
      });
    },
  });
  const widgetUrl = `${window.location.origin}/widget/calendar/${facilityId}`;
  const embedCode = `<iframe 
  src="${widgetUrl}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!facilityId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        <Card className="p-12 text-center">
          <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Facility</h3>
          <p className="text-muted-foreground">
            You need to be assigned to a facility to access settings
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your facility settings and integrations
        </p>
      </div>

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bookings" data-testid="tab-bookings">
            <Calendar className="w-4 h-4 mr-2" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="widgets" data-testid="tab-widgets">
            <Code className="w-4 h-4 mr-2" />
            Embeddable Widgets
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Booking Options</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure how members can book bays, lessons, and club fittings
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-bay-selection">Allow Bay Selection</Label>
                  <p className="text-sm text-muted-foreground">
                    Let customers choose specific bays when booking (can also be enabled per membership tier)
                  </p>
                </div>
                <Switch
                  id="allow-bay-selection"
                  checked={facility?.allowBaySelection || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ allowBaySelection: checked })
                  }
                  disabled={isLoading || updateSettingsMutation.isPending}
                  data-testid="switch-allow-bay-selection"
                />
              </div>

              <div className="border-t pt-6 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-bay-lessons">Allow Bay Reservation with Lessons</Label>
                  <p className="text-sm text-muted-foreground">
                    Let members optionally add a bay reservation when booking a lesson
                  </p>
                </div>
                <Switch
                  id="allow-bay-lessons"
                  checked={facility?.allowBayWithLessons || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ allowBayWithLessons: checked })
                  }
                  disabled={isLoading || updateSettingsMutation.isPending}
                  data-testid="switch-allow-bay-lessons"
                />
              </div>

              <div className="border-t pt-6 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-bay-fittings">Allow Bay Reservation with Club Fittings</Label>
                  <p className="text-sm text-muted-foreground">
                    Let members optionally add a bay reservation when booking a club fitting
                  </p>
                </div>
                <Switch
                  id="allow-bay-fittings"
                  checked={facility?.allowBayWithFittings || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ allowBayWithFittings: checked })
                  }
                  disabled={isLoading || updateSettingsMutation.isPending}
                  data-testid="switch-allow-bay-fittings"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Booking Buffers</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure minimum advance booking times and gaps between bookings
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="Bay Booking Advance"
                  description="Minimum time before a bay can be booked"
                  value={facility?.bayBookingBufferMinutes || 30}
                  onChange={(minutes) => updateSettingsMutation.mutate({ bayBookingBufferMinutes: minutes })}
                  disabled={isLoading || updateSettingsMutation.isPending}
                  testId="input-bay-booking-buffer"
                />

                <TimeInput
                  label="Bay Buffer Between"
                  description="Gap time between consecutive bay bookings"
                  value={facility?.bayBufferBetweenMinutes || 5}
                  onChange={(minutes) => updateSettingsMutation.mutate({ bayBufferBetweenMinutes: minutes })}
                  disabled={isLoading || updateSettingsMutation.isPending}
                  testId="input-bay-buffer-between"
                />
              </div>

              <div className="border-t pt-6 grid grid-cols-2 gap-4">
                <TimeInput
                  label="Lesson Booking Advance"
                  description="Minimum advance time for lessons"
                  value={facility?.lessonBookingBufferMinutes || 1440}
                  onChange={(minutes) => updateSettingsMutation.mutate({ lessonBookingBufferMinutes: minutes })}
                  disabled={isLoading || updateSettingsMutation.isPending}
                  testId="input-lesson-booking-buffer"
                />

                <TimeInput
                  label="Lesson Buffer Between"
                  description="Gap time between consecutive lessons"
                  value={facility?.lessonBufferBetweenMinutes || 15}
                  onChange={(minutes) => updateSettingsMutation.mutate({ lessonBufferBetweenMinutes: minutes })}
                  disabled={isLoading || updateSettingsMutation.isPending}
                  testId="input-lesson-buffer-between"
                />
              </div>

              <div className="border-t pt-6 grid grid-cols-2 gap-4">
                <TimeInput
                  label="Fitting Booking Advance"
                  description="Minimum advance time for fittings"
                  value={facility?.fittingBookingBufferMinutes || 1440}
                  onChange={(minutes) => updateSettingsMutation.mutate({ fittingBookingBufferMinutes: minutes })}
                  disabled={isLoading || updateSettingsMutation.isPending}
                  testId="input-fitting-booking-buffer"
                />

                <TimeInput
                  label="Fitting Buffer Between"
                  description="Gap time between consecutive fittings"
                  value={facility?.fittingBufferBetweenMinutes || 15}
                  onChange={(minutes) => updateSettingsMutation.mutate({ fittingBufferBetweenMinutes: minutes })}
                  disabled={isLoading || updateSettingsMutation.isPending}
                  testId="input-fitting-buffer-between"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Calendar Widget</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Embed this calendar on your website to allow customers to book bay time directly
            </p>

            <div className="space-y-6">
              <div>
                <Label htmlFor="widget-url">Widget URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="widget-url"
                    value={widgetUrl}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-widget-url"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(widgetUrl, "Widget URL")}
                    data-testid="button-copy-url"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(widgetUrl, "_blank")}
                    data-testid="button-open-widget"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Direct link to your booking widget
                </p>
              </div>

              <div>
                <Label htmlFor="embed-code">Embed Code (iframe)</Label>
                <div className="mt-2 space-y-2">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
                      <code data-testid="text-embed-code">{embedCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(embedCode, "Embed code")}
                      data-testid="button-copy-embed"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy and paste this code into your website's HTML
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-2">Preview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This is how the widget will appear on your website
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={widgetUrl}
                    width="100%"
                    height="600"
                    style={{ border: "none" }}
                    title="Widget Preview"
                    data-testid="iframe-widget-preview"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-2">Integration Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Copy the embed code above</li>
              <li>Open your website's HTML editor or page builder</li>
              <li>Paste the code where you want the calendar to appear</li>
              <li>Save and publish your changes</li>
              <li>The calendar will automatically update with your facility's availability</li>
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Payment Settings</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure Stripe payment credentials to enable membership and package purchases
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="payment-provider">Payment Provider</Label>
                <Select
                  value={paymentProvider}
                  onValueChange={setPaymentProvider}
                  disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                >
                  <SelectTrigger id="payment-provider" data-testid="select-payment-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Currently only Stripe is supported
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-publishable-key">Stripe Publishable Key</Label>
                <Input
                  id="stripe-publishable-key"
                  type="text"
                  placeholder="pk_..."
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                  data-testid="input-stripe-publishable-key"
                />
                <p className="text-xs text-muted-foreground">
                  Your publishable key is safe to use in client-side code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-secret-key">Stripe Secret Key</Label>
                <Input
                  id="stripe-secret-key"
                  type="password"
                  placeholder={paymentSettings?.hasStripeSecretKey ? "sk_**** (already set)" : "sk_..."}
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                  data-testid="input-stripe-secret-key"
                />
                <p className="text-xs text-muted-foreground">
                  {paymentSettings?.hasStripeSecretKey 
                    ? "Key is already configured. Enter a new key to update it." 
                    : "Your secret key will be encrypted and stored securely"}
                </p>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="payments-enabled">Enable Payments</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to purchase memberships and packages online
                    </p>
                  </div>
                  <Switch
                    id="payments-enabled"
                    checked={paymentsEnabled}
                    onCheckedChange={setPaymentsEnabled}
                    disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                    data-testid="switch-payments-enabled"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <Button
                  onClick={() => {
                    const updates: any = {
                      paymentProvider,
                      stripePublishableKey,
                      paymentsEnabled,
                    };
                    // Only include secret key if user entered a new value
                    if (stripeSecretKey.trim()) {
                      updates.stripeSecretKey = stripeSecretKey;
                    }
                    updatePaymentSettingsMutation.mutate(updates);
                  }}
                  disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                  data-testid="button-save-payment-settings"
                >
                  {updatePaymentSettingsMutation.isPending ? "Saving..." : "Save Payment Settings"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-2">Getting Your Stripe API Keys</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Visit your{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  data-testid="link-stripe-dashboard"
                >
                  Stripe Dashboard API Keys page
                </a>
              </li>
              <li>Copy your Publishable key (starts with "pk_")</li>
              <li>Copy your Secret key (starts with "sk_")</li>
              <li>Paste both keys in the fields above</li>
              <li>Enable payments and click "Save Payment Settings"</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Note:</strong> For testing, use your test mode keys. For production, use your live mode keys.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card className="p-12 text-center">
            <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">General Settings</h3>
            <p className="text-muted-foreground">
              General facility settings will be available here
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
