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
import { Settings as SettingsIcon, Copy, ExternalLink, Code, Calendar, CreditCard, Palette, CheckCircle2, MapPin, Radio, Sparkles, Upload, Link as LinkIcon, Clock, Mail, MessageSquare, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

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

function CommunicationTab({ facilityId }: { facilityId: string }) {
  const { toast } = useToast();
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testSmsTo, setTestSmsTo] = useState("");

  const { data: commStatus, isLoading: isLoadingStatus } = useQuery<{
    email: { configured: boolean; provider: string | null };
    sms: { configured: boolean; provider: string | null };
  }>({
    queryKey: [`/api/facilities/${facilityId}/communication/status`],
    enabled: !!facilityId,
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/facilities/${facilityId}/communication/test-email`, {
        to: testEmailTo,
        subject: 'Test Email from GolfSimOS',
        body: 'This is a test email to verify your email configuration is working correctly.',
      });
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: `A test email has been sent to ${testEmailTo}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testSmsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/facilities/${facilityId}/communication/test-sms`, {
        to: testSmsTo,
        body: 'This is a test SMS from GolfSimOS. Your SMS configuration is working correctly!',
      });
    },
    onSuccess: () => {
      toast({
        title: "Test SMS Sent",
        description: `A test SMS has been sent to ${testSmsTo}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SMS Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <TabsContent value="communication" className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Communication Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure email and SMS messaging for marketing, notifications, and customer communication
        </p>

        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 border-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Email (SendGrid)</h3>
                  <div className="flex items-center gap-2" data-testid="status-email-config">
                    {isLoadingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin" data-testid="loader-email-status" />
                    ) : commStatus?.email.configured ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400" data-testid="text-email-configured">Configured</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-600 dark:text-amber-400" data-testid="text-email-not-configured">Not Configured</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {commStatus?.email.configured ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    SendGrid is configured and ready to send emails.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="Enter email address"
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                        data-testid="input-test-email"
                      />
                      <Button
                        onClick={() => testEmailMutation.mutate()}
                        disabled={!testEmailTo || testEmailMutation.isPending}
                        data-testid="button-send-test-email"
                      >
                        {testEmailMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    To enable email sending, add your SendGrid API key.
                  </p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs font-mono">SENDGRID_API_KEY</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your API key from{" "}
                      <a
                        href="https://app.sendgrid.com/settings/api_keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        SendGrid Settings
                      </a>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Set <span className="font-mono">SENDGRID_FROM_EMAIL</span> to customize the sender address.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6 border-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">SMS (Twilio)</h3>
                  <div className="flex items-center gap-2" data-testid="status-sms-config">
                    {isLoadingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin" data-testid="loader-sms-status" />
                    ) : commStatus?.sms.configured ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400" data-testid="text-sms-configured">Configured</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-600 dark:text-amber-400" data-testid="text-sms-not-configured">Not Configured</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {commStatus?.sms.configured ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Twilio is configured and ready to send SMS messages.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="test-sms">Send Test SMS</Label>
                    <div className="flex gap-2">
                      <Input
                        id="test-sms"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={testSmsTo}
                        onChange={(e) => setTestSmsTo(e.target.value)}
                        data-testid="input-test-sms"
                      />
                      <Button
                        onClick={() => testSmsMutation.mutate()}
                        disabled={!testSmsTo || testSmsMutation.isPending}
                        data-testid="button-send-test-sms"
                      >
                        {testSmsMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    To enable SMS sending, add your Twilio credentials.
                  </p>
                  <div className="p-3 bg-muted rounded-md space-y-1">
                    <p className="text-xs font-mono">TWILIO_ACCOUNT_SID</p>
                    <p className="text-xs font-mono">TWILIO_AUTH_TOKEN</p>
                    <p className="text-xs font-mono">TWILIO_PHONE_NUMBER</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your credentials from{" "}
                      <a
                        href="https://console.twilio.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Twilio Console
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6 border-dashed">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              GolfMarketingOS Integration
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Email and SMS are automatically integrated with the GolfMarketingOS marketing automation platform. 
              Create automated campaigns that send personalized messages based on customer behavior and events.
            </p>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Automated booking confirmations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Membership renewal reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Lesson and fitting follow-ups</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>TrackMan session analytics and tips</span>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </TabsContent>
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
  
  // Widget payment configuration
  const [allowPayOnline, setAllowPayOnline] = useState(true);
  const [allowPayAtDesk, setAllowPayAtDesk] = useState(true);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("online");

  // Brand settings local state
  const [brandSettings, setBrandSettings] = useState({
    name: "",
    logo: "",
    address: "",
    phone: "",
    email: "",
    supportEmail: "",
    primaryColor: "#16a34a",
    accentColor: "#22c55e",
    footerText: "",
    privacyPolicyUrl: "",
    termsOfServiceUrl: "",
  });

  // Logo upload mode (url or upload)
  const [logoUploadMode, setLogoUploadMode] = useState<"url" | "upload">("url");

  const facilityId = user?.facilityId || "";

  const { data: facility, isLoading } = useQuery<any>({
    queryKey: [`/api/facilities/${facilityId}`],
    enabled: !!facilityId,
  });

  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = useQuery<any>({
    queryKey: ["/api/payment-settings"],
    enabled: !!facilityId,
  });

  // Widget configurations
  const { data: rentalWidgetConfig } = useQuery<any>({
    queryKey: [`/api/widget-config/${facilityId}/rental`],
    enabled: !!facilityId,
  });

  const { data: lessonWidgetConfig } = useQuery<any>({
    queryKey: [`/api/widget-config/${facilityId}/lesson`],
    enabled: !!facilityId,
  });

  const { data: fittingWidgetConfig } = useQuery<any>({
    queryKey: [`/api/widget-config/${facilityId}/fitting`],
    enabled: !!facilityId,
  });

  // Widget config mutations
  const updateWidgetConfigMutation = useMutation({
    mutationFn: async ({ widgetType, config }: { widgetType: string; config: any }) => {
      const response = await fetch(`/api/widget-config/${facilityId}/${widgetType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error("Failed to update widget config");
      return response.json();
    },
    onSuccess: (_, { widgetType }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/widget-config/${facilityId}/${widgetType}`] });
      toast({
        title: "Success",
        description: "Widget customization saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save widget customization",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (paymentSettings) {
      setPaymentProvider(paymentSettings.paymentProvider || "stripe");
      setStripePublishableKey(paymentSettings.stripePublishableKey || "");
      // Don't set stripeSecretKey to masked value - keep it empty if key exists
      // User must enter a new key to update it
      setStripeSecretKey("");
      setPaymentsEnabled(paymentSettings.paymentsEnabled || false);
      
      // Widget payment settings
      setAllowPayOnline(paymentSettings.allowPayOnline ?? true);
      setAllowPayAtDesk(paymentSettings.allowPayAtDesk ?? true);
      setDefaultPaymentMethod(paymentSettings.defaultPaymentMethod || "online");
    }
  }, [paymentSettings]);

  // Initialize brand settings from facility data
  useEffect(() => {
    if (facility) {
      setBrandSettings({
        name: facility.name || "",
        logo: facility.logo || "",
        address: facility.address || "",
        phone: facility.phone || "",
        email: facility.email || "",
        supportEmail: facility.supportEmail || "",
        primaryColor: facility.primaryColor || "#16a34a",
        accentColor: facility.accentColor || "#22c55e",
        footerText: facility.footerText || "",
        privacyPolicyUrl: facility.privacyPolicyUrl || "",
        termsOfServiceUrl: facility.termsOfServiceUrl || "",
      });
    }
  }, [facility]);

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
      queryClient.invalidateQueries({ queryKey: [`/api/facilities/${facilityId}`] });
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

  // Widget Customization Component
  const WidgetCustomization = ({ widgetType, config }: { widgetType: string; config: any }) => {
    const [localConfig, setLocalConfig] = useState(config || {});

    useEffect(() => {
      setLocalConfig(config || {});
    }, [config]);

    const handleSave = () => {
      updateWidgetConfigMutation.mutate({ widgetType, config: localConfig });
    };

    const updateField = (field: string, value: any) => {
      setLocalConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
      <div className="space-y-6 border-b pb-6">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Customize Widget Appearance</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-primary-color`}>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id={`${widgetType}-primary-color`}
                type="color"
                value={localConfig.primaryColor || "#22c55e"}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                className="w-20 h-10 cursor-pointer"
                data-testid={`input-${widgetType}-primary-color`}
              />
              <Input
                value={localConfig.primaryColor || "#22c55e"}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                placeholder="#22c55e"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-accent-color`}>Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id={`${widgetType}-accent-color`}
                type="color"
                value={localConfig.accentColor || "#16a34a"}
                onChange={(e) => updateField("accentColor", e.target.value)}
                className="w-20 h-10 cursor-pointer"
                data-testid={`input-${widgetType}-accent-color`}
              />
              <Input
                value={localConfig.accentColor || "#16a34a"}
                onChange={(e) => updateField("accentColor", e.target.value)}
                placeholder="#16a34a"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-bg-color`}>Background Color</Label>
            <div className="flex gap-2">
              <Input
                id={`${widgetType}-bg-color`}
                type="color"
                value={localConfig.backgroundColor || "#ffffff"}
                onChange={(e) => updateField("backgroundColor", e.target.value)}
                className="w-20 h-10 cursor-pointer"
                data-testid={`input-${widgetType}-bg-color`}
              />
              <Input
                value={localConfig.backgroundColor || "#ffffff"}
                onChange={(e) => updateField("backgroundColor", e.target.value)}
                placeholder="#ffffff"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-text-color`}>Text Color</Label>
            <div className="flex gap-2">
              <Input
                id={`${widgetType}-text-color`}
                type="color"
                value={localConfig.textColor || "#000000"}
                onChange={(e) => updateField("textColor", e.target.value)}
                className="w-20 h-10 cursor-pointer"
                data-testid={`input-${widgetType}-text-color`}
              />
              <Input
                value={localConfig.textColor || "#000000"}
                onChange={(e) => updateField("textColor", e.target.value)}
                placeholder="#000000"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Border Radius */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-border-radius`}>Border Radius</Label>
            <Select
              value={localConfig.borderRadius || "8px"}
              onValueChange={(value) => updateField("borderRadius", value)}
            >
              <SelectTrigger data-testid={`select-${widgetType}-border-radius`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">None (0px)</SelectItem>
                <SelectItem value="4px">Small (4px)</SelectItem>
                <SelectItem value="8px">Medium (8px)</SelectItem>
                <SelectItem value="12px">Large (12px)</SelectItem>
                <SelectItem value="16px">Extra Large (16px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {/* Custom Title */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-custom-title`}>Custom Title (optional)</Label>
            <Input
              id={`${widgetType}-custom-title`}
              value={localConfig.customTitle || ""}
              onChange={(e) => updateField("customTitle", e.target.value)}
              placeholder="Leave empty to use default"
              data-testid={`input-${widgetType}-custom-title`}
            />
          </div>

          {/* Custom Description */}
          <div className="space-y-2">
            <Label htmlFor={`${widgetType}-custom-description`}>Custom Description (optional)</Label>
            <Textarea
              id={`${widgetType}-custom-description`}
              value={localConfig.customDescription || ""}
              onChange={(e) => updateField("customDescription", e.target.value)}
              placeholder="Leave empty to use default"
              rows={2}
              data-testid={`input-${widgetType}-custom-description`}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Show Logo */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor={`${widgetType}-show-logo`}>Show Facility Logo</Label>
            <Switch
              id={`${widgetType}-show-logo`}
              checked={localConfig.showLogo !== false}
              onCheckedChange={(checked) => updateField("showLogo", checked)}
              data-testid={`switch-${widgetType}-show-logo`}
            />
          </div>

          {/* Show Description */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor={`${widgetType}-show-description`}>Show Description</Label>
            <Switch
              id={`${widgetType}-show-description`}
              checked={localConfig.showDescription !== false}
              onCheckedChange={(checked) => updateField("showDescription", checked)}
              data-testid={`switch-${widgetType}-show-description`}
            />
          </div>

          {/* Show Pricing */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor={`${widgetType}-show-pricing`}>Show Pricing</Label>
            <Switch
              id={`${widgetType}-show-pricing`}
              checked={localConfig.showPricing !== false}
              onCheckedChange={(checked) => updateField("showPricing", checked)}
              data-testid={`switch-${widgetType}-show-pricing`}
            />
          </div>

          {/* Require Phone */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor={`${widgetType}-require-phone`}>Require Phone Number</Label>
            <Switch
              id={`${widgetType}-require-phone`}
              checked={localConfig.requirePhone === true}
              onCheckedChange={(checked) => updateField("requirePhone", checked)}
              data-testid={`switch-${widgetType}-require-phone`}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateWidgetConfigMutation.isPending}
          data-testid={`button-save-${widgetType}-customization`}
        >
          {updateWidgetConfigMutation.isPending ? "Saving..." : "Save Customization"}
        </Button>
      </div>
    );
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
          <TabsTrigger value="thankyou" data-testid="tab-thankyou">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Thank You Page
          </TabsTrigger>
          <TabsTrigger value="brand" data-testid="tab-brand">
            <Sparkles className="w-4 h-4 mr-2" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="communication" data-testid="tab-communication">
            <Mail className="w-4 h-4 mr-2" />
            Communication
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
            <h2 className="text-xl font-semibold mb-4">Booking Widgets</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Embed these widgets on your website to allow customers to book services directly
            </p>

            <Tabs defaultValue="calendar" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="calendar" data-testid="tab-calendar-widget">Calendar</TabsTrigger>
                <TabsTrigger value="rental" data-testid="tab-rental-widget">Rentals</TabsTrigger>
                <TabsTrigger value="lesson" data-testid="tab-lesson-widget">Lessons</TabsTrigger>
                <TabsTrigger value="fitting" data-testid="tab-fitting-widget">Fittings</TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="calendar-widget-url">Widget URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="calendar-widget-url"
                        value={widgetUrl}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-calendar-widget-url"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleCopy(widgetUrl, "Calendar Widget URL")}
                        data-testid="button-copy-calendar-url"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(widgetUrl, "_blank")}
                        data-testid="button-open-calendar-widget"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="calendar-embed-code">Embed Code</Label>
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
                          <code data-testid="text-calendar-embed-code">{embedCode}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopy(embedCode, "Calendar embed code")}
                          data-testid="button-copy-calendar-embed"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Preview</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={widgetUrl}
                        width="100%"
                        height="600"
                        style={{ border: "none" }}
                        title="Calendar Widget Preview"
                        data-testid="iframe-calendar-widget-preview"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rental" className="space-y-6">
                <div className="space-y-4">
                  <WidgetCustomization widgetType="rental" config={rentalWidgetConfig} />
                  
                  <div>
                    <Label htmlFor="rental-widget-url">Widget URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="rental-widget-url"
                        value={`${window.location.origin}/widget/rental/${facilityId}`}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-rental-widget-url"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleCopy(`${window.location.origin}/widget/rental/${facilityId}`, "Rental Widget URL")}
                        data-testid="button-copy-rental-url"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`${window.location.origin}/widget/rental/${facilityId}`, "_blank")}
                        data-testid="button-open-rental-widget"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="rental-embed-code">Embed Code</Label>
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
                          <code data-testid="text-rental-embed-code">{`<iframe 
  src="${window.location.origin}/widget/rental/${facilityId}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopy(`<iframe src="${window.location.origin}/widget/rental/${facilityId}" width="100%" height="800" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`, "Rental embed code")}
                          data-testid="button-copy-rental-embed"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Display Modes</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add <code className="bg-background px-1 py-0.5 rounded">?mode=</code> parameter to control widget display:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=full</code> - Full widget with all features (default)</li>
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=partial</code> - Compact view</li>
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=sidebar</code> - Narrow sidebar layout</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Preview</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={`${window.location.origin}/widget/rental/${facilityId}`}
                        width="100%"
                        height="600"
                        style={{ border: "none" }}
                        title="Rental Widget Preview"
                        data-testid="iframe-rental-widget-preview"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lesson" className="space-y-6">
                <div className="space-y-4">
                  <WidgetCustomization widgetType="lesson" config={lessonWidgetConfig} />
                  
                  <div>
                    <Label htmlFor="lesson-widget-url">Widget URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="lesson-widget-url"
                        value={`${window.location.origin}/widget/lesson/${facilityId}/[LESSON_OFFER_ID]`}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-lesson-widget-url"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleCopy(`${window.location.origin}/widget/lesson/${facilityId}/[LESSON_OFFER_ID]`, "Lesson Widget URL")}
                        data-testid="button-copy-lesson-url"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Replace <code className="bg-background px-1 py-0.5 rounded">[LESSON_OFFER_ID]</code> with your specific lesson offering ID
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="lesson-embed-code">Embed Code</Label>
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
                          <code data-testid="text-lesson-embed-code">{`<iframe 
  src="${window.location.origin}/widget/lesson/${facilityId}/[LESSON_OFFER_ID]" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopy(`<iframe src="${window.location.origin}/widget/lesson/${facilityId}/[LESSON_OFFER_ID]" width="100%" height="800" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`, "Lesson embed code")}
                          data-testid="button-copy-lesson-embed"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Required Parameter</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      The lesson widget requires a <code className="bg-background px-1 py-0.5 rounded">lessonOfferId</code> to display the correct lesson offering.
                    </p>
                    <h4 className="font-medium text-sm mb-2 mt-4">Display Modes</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add <code className="bg-background px-1 py-0.5 rounded">?mode=</code> parameter to control widget display:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=full</code> - Full widget with all features (default)</li>
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=partial</code> - Compact view</li>
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=sidebar</code> - Narrow sidebar layout</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fitting" className="space-y-6">
                <div className="space-y-4">
                  <WidgetCustomization widgetType="fitting" config={fittingWidgetConfig} />
                  
                  <div>
                    <Label htmlFor="fitting-widget-url">Widget URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="fitting-widget-url"
                        value={`${window.location.origin}/widget/fitting/${facilityId}`}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-fitting-widget-url"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleCopy(`${window.location.origin}/widget/fitting/${facilityId}`, "Fitting Widget URL")}
                        data-testid="button-copy-fitting-url"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`${window.location.origin}/widget/fitting/${facilityId}`, "_blank")}
                        data-testid="button-open-fitting-widget"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fitting-embed-code">Embed Code</Label>
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
                          <code data-testid="text-fitting-embed-code">{`<iframe 
  src="${window.location.origin}/widget/fitting/${facilityId}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>`}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopy(`<iframe src="${window.location.origin}/widget/fitting/${facilityId}" width="100%" height="800" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`, "Fitting embed code")}
                          data-testid="button-copy-fitting-embed"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Display Modes</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add <code className="bg-background px-1 py-0.5 rounded">?mode=</code> parameter to control widget display:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=full</code> - Full widget with all features (default)</li>
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=partial</code> - Compact view</li>
                      <li>• <code className="bg-background px-1 py-0.5 rounded">?mode=sidebar</code> - Narrow sidebar layout</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Preview</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={`${window.location.origin}/widget/fitting/${facilityId}`}
                        width="100%"
                        height="600"
                        style={{ border: "none" }}
                        title="Fitting Widget Preview"
                        data-testid="iframe-fitting-widget-preview"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-2">Integration Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Select the widget type you want to embed (Calendar, Rental, Lesson, or Fitting)</li>
              <li>Copy the embed code for your chosen widget</li>
              <li>Open your website's HTML editor or page builder</li>
              <li>Paste the code where you want the widget to appear</li>
              <li>For lesson widgets, replace [LESSON_OFFER_ID] with your specific lesson offering ID</li>
              <li>Save and publish your changes</li>
              <li>The widget will automatically update with your facility's availability</li>
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

              <div className="border-t pt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Widget Payment Options</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure which payment methods customers can use when booking through your widget
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-pay-online">Allow Pay Online</Label>
                    <p className="text-sm text-muted-foreground">
                      Customers can pay immediately via Stripe
                    </p>
                  </div>
                  <Switch
                    id="allow-pay-online"
                    checked={allowPayOnline}
                    onCheckedChange={setAllowPayOnline}
                    disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                    data-testid="switch-allow-pay-online"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-pay-at-desk">Allow Pay at Desk</Label>
                    <p className="text-sm text-muted-foreground">
                      Customers can book and pay later at your facility
                    </p>
                  </div>
                  <Switch
                    id="allow-pay-at-desk"
                    checked={allowPayAtDesk}
                    onCheckedChange={setAllowPayAtDesk}
                    disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                    data-testid="switch-allow-pay-at-desk"
                  />
                </div>

                {(allowPayOnline || allowPayAtDesk) && (
                  <div className="space-y-2">
                    <Label htmlFor="default-payment-method">Default Payment Method</Label>
                    <Select
                      value={defaultPaymentMethod}
                      onValueChange={setDefaultPaymentMethod}
                      disabled={isLoadingPaymentSettings || updatePaymentSettingsMutation.isPending}
                    >
                      <SelectTrigger id="default-payment-method" data-testid="select-default-payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowPayOnline && <SelectItem value="online">Pay Online (Preferred)</SelectItem>}
                        {allowPayAtDesk && <SelectItem value="at_desk">Pay at Desk (Preferred)</SelectItem>}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This option will be preferred by default in your booking widget
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <Button
                  onClick={() => {
                    const updates: any = {
                      paymentProvider,
                      stripePublishableKey,
                      paymentsEnabled,
                      allowPayOnline,
                      allowPayAtDesk,
                      defaultPaymentMethod,
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

        <TabsContent value="thankyou" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Thank You Page Settings</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Customize the thank you page customers see after purchasing memberships, bookings, lessons, or fittings
            </p>

            <div className="space-y-6">
              {/* Enable Thank You Page */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="thank-you-enabled">Enable Thank You Page</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a confirmation page after successful purchases
                  </p>
                </div>
                <Switch
                  id="thank-you-enabled"
                  checked={facility?.thankYouPageEnabled !== false}
                  onCheckedChange={(checked) =>
                    updateSettingsMutation.mutate({ thankYouPageEnabled: checked })
                  }
                  data-testid="switch-thank-you-enabled"
                />
              </div>

              {/* Use External URL */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use-external-thank-you">Use External Thank You Page</Label>
                  <p className="text-sm text-muted-foreground">
                    Redirect to an external URL instead of the built-in page
                  </p>
                </div>
                <Switch
                  id="use-external-thank-you"
                  checked={facility?.useExternalThankYouPage || false}
                  onCheckedChange={(checked) =>
                    updateSettingsMutation.mutate({ useExternalThankYouPage: checked })
                  }
                  disabled={!facility?.thankYouPageEnabled}
                  data-testid="switch-use-external-thank-you"
                />
              </div>

              {/* External URL Input */}
              {facility?.useExternalThankYouPage && (
                <div className="space-y-2">
                  <Label htmlFor="external-thank-you-url">External Thank You Page URL</Label>
                  <Input
                    id="external-thank-you-url"
                    type="url"
                    value={facility?.thankYouPageExternalUrl || ""}
                    onChange={(e) =>
                      updateSettingsMutation.mutate({ thankYouPageExternalUrl: e.target.value })
                    }
                    placeholder="https://yourwebsite.com/thank-you"
                    data-testid="input-external-thank-you-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Customers will be redirected to this URL after completing a purchase
                  </p>
                </div>
              )}

              {/* Custom Welcome Message */}
              {!facility?.useExternalThankYouPage && facility?.thankYouPageEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="thank-you-message">Custom Welcome Message (Optional)</Label>
                  <Textarea
                    id="thank-you-message"
                    value={facility?.thankYouPageMessage || ""}
                    onChange={(e) =>
                      updateSettingsMutation.mutate({ thankYouPageMessage: e.target.value })
                    }
                    placeholder="Enter a custom message to welcome your customers..."
                    rows={4}
                    data-testid="input-thank-you-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will appear on the thank you page below the confirmation details
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Preview Card */}
          {!facility?.useExternalThankYouPage && facility?.thankYouPageEnabled && (
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Preview
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Your thank you page will include:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Confirmation message with customer's name</li>
                  <li>Purchase details (booking date/time for appointments)</li>
                  {facility?.thankYouPageMessage && <li>Your custom welcome message</li>}
                  <li>Facility address and contact information</li>
                  <li>Confirmation email notice</li>
                  <li>Return to homepage button</li>
                </ul>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Brand Identity</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure your facility's branding to be used across the platform, widgets, and customer-facing pages
            </p>

            <div className="space-y-6">
              {/* Facility Name */}
              <div className="space-y-2">
                <Label htmlFor="facility-name">Facility Name</Label>
                <Input
                  id="facility-name"
                  value={brandSettings.name}
                  onChange={(e) =>
                    setBrandSettings({ ...brandSettings, name: e.target.value })
                  }
                  onBlur={() =>
                    updateSettingsMutation.mutate({ name: brandSettings.name })
                  }
                  placeholder="Your Facility Name"
                  data-testid="input-facility-name"
                />
                <p className="text-xs text-muted-foreground">
                  Your facility name appears on receipts, emails, and public pages
                </p>
              </div>

              {/* Logo */}
              <div className="space-y-3">
                <Label>Logo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={logoUploadMode === "url" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogoUploadMode("url")}
                    data-testid="button-logo-url-mode"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={logoUploadMode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogoUploadMode("upload")}
                    data-testid="button-logo-upload-mode"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {logoUploadMode === "url" ? (
                  <div className="space-y-2">
                    <Input
                      id="logo-url"
                      type="url"
                      value={brandSettings.logo}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, logo: e.target.value })
                      }
                      onBlur={() =>
                        updateSettingsMutation.mutate({ logoUrl: brandSettings.logo })
                      }
                      placeholder="https://example.com/logo.png"
                      data-testid="input-logo-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to your logo image. Recommended: 200x200px PNG or SVG
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onGetUploadParameters={async () => {
                        const response = await apiRequest("/api/objects/upload", {
                          method: "POST",
                        });
                        return {
                          method: "PUT" as const,
                          url: response.uploadURL,
                        };
                      }}
                      onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                        if (result.successful.length > 0) {
                          const uploadURL = result.successful[0].uploadURL;
                          try {
                            const response = await apiRequest("/api/facility-logo", {
                              method: "PUT",
                              body: JSON.stringify({ logoUrl: uploadURL }),
                              headers: { "Content-Type": "application/json" },
                            });
                            setBrandSettings({ ...brandSettings, logo: response.objectPath });
                            queryClient.invalidateQueries({ queryKey: ["/api/facility"] });
                            toast({
                              title: "Success",
                              description: "Logo uploaded successfully",
                            });
                          } catch (error) {
                            console.error("Error setting logo:", error);
                            toast({
                              title: "Error",
                              description: "Failed to save logo",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                      variant="outline"
                      size="default"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </ObjectUploader>
                    <p className="text-xs text-muted-foreground">
                      Upload an image file. Max size: 5MB. Recommended: 200x200px PNG or SVG
                    </p>
                    {brandSettings.logo && brandSettings.logo.startsWith("/objects/") && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-2">Current uploaded logo:</p>
                        <img 
                          src={brandSettings.logo} 
                          alt="Logo preview" 
                          className="w-20 h-20 object-contain border rounded"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your contact details will be displayed on receipts, emails, and customer-facing pages
            </p>

            <div className="space-y-6">
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="facility-address">Address</Label>
                <Textarea
                  id="facility-address"
                  value={brandSettings.address}
                  onChange={(e) =>
                    setBrandSettings({ ...brandSettings, address: e.target.value })
                  }
                  onBlur={() =>
                    updateSettingsMutation.mutate({ address: brandSettings.address })
                  }
                  placeholder="123 Main Street, City, State 12345"
                  rows={3}
                  data-testid="input-facility-address"
                />
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facility-phone">Phone Number</Label>
                  <Input
                    id="facility-phone"
                    type="tel"
                    value={brandSettings.phone}
                    onChange={(e) =>
                      setBrandSettings({ ...brandSettings, phone: e.target.value })
                    }
                    onBlur={() =>
                      updateSettingsMutation.mutate({ phone: brandSettings.phone })
                    }
                    placeholder="(555) 123-4567"
                    data-testid="input-facility-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facility-email">General Email</Label>
                  <Input
                    id="facility-email"
                    type="email"
                    value={brandSettings.email}
                    onChange={(e) =>
                      setBrandSettings({ ...brandSettings, email: e.target.value })
                    }
                    onBlur={() =>
                      updateSettingsMutation.mutate({ email: brandSettings.email })
                    }
                    placeholder="info@example.com"
                    data-testid="input-facility-email"
                  />
                </div>
              </div>

              {/* Support Email */}
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={brandSettings.supportEmail}
                  onChange={(e) =>
                    setBrandSettings({ ...brandSettings, supportEmail: e.target.value })
                  }
                  onBlur={() =>
                    updateSettingsMutation.mutate({ supportEmail: brandSettings.supportEmail })
                  }
                  placeholder="support@example.com"
                  data-testid="input-support-email"
                />
                <p className="text-xs text-muted-foreground">
                  Dedicated email for customer support inquiries
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Brand Colors</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Customize the colors used in your widgets and customer-facing pages
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={brandSettings.primaryColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      setBrandSettings({ ...brandSettings, primaryColor: color });
                      updateSettingsMutation.mutate({ primaryColor: color });
                    }}
                    className="w-20 h-10 cursor-pointer"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={brandSettings.primaryColor}
                    onChange={(e) =>
                      setBrandSettings({ ...brandSettings, primaryColor: e.target.value })
                    }
                    onBlur={() =>
                      updateSettingsMutation.mutate({ primaryColor: brandSettings.primaryColor })
                    }
                    placeholder="#16a34a"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Main brand color used for buttons and highlights
                </p>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent-color"
                    type="color"
                    value={brandSettings.accentColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      setBrandSettings({ ...brandSettings, accentColor: color });
                      updateSettingsMutation.mutate({ accentColor: color });
                    }}
                    className="w-20 h-10 cursor-pointer"
                    data-testid="input-accent-color"
                  />
                  <Input
                    value={brandSettings.accentColor}
                    onChange={(e) =>
                      setBrandSettings({ ...brandSettings, accentColor: e.target.value })
                    }
                    onBlur={() =>
                      updateSettingsMutation.mutate({ accentColor: brandSettings.accentColor })
                    }
                    placeholder="#22c55e"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Secondary color for accents and hover states
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Footer & Legal</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add custom footer text and links to your legal pages
            </p>

            <div className="space-y-6">
              {/* Footer Text */}
              <div className="space-y-2">
                <Label htmlFor="footer-text">Footer Text</Label>
                <Textarea
                  id="footer-text"
                  value={brandSettings.footerText}
                  onChange={(e) =>
                    setBrandSettings({ ...brandSettings, footerText: e.target.value })
                  }
                  onBlur={() =>
                    updateSettingsMutation.mutate({ footerText: brandSettings.footerText })
                  }
                  placeholder="© 2025 Your Facility. All rights reserved."
                  rows={3}
                  data-testid="input-footer-text"
                />
                <p className="text-xs text-muted-foreground">
                  Custom footer text displayed on emails and customer-facing pages
                </p>
              </div>

              {/* Legal Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="privacy-policy-url">Privacy Policy URL</Label>
                  <Input
                    id="privacy-policy-url"
                    type="url"
                    value={brandSettings.privacyPolicyUrl}
                    onChange={(e) =>
                      setBrandSettings({ ...brandSettings, privacyPolicyUrl: e.target.value })
                    }
                    onBlur={() =>
                      updateSettingsMutation.mutate({ privacyPolicyUrl: brandSettings.privacyPolicyUrl })
                    }
                    placeholder="https://example.com/privacy"
                    data-testid="input-privacy-policy-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms-url">Terms of Service URL</Label>
                  <Input
                    id="terms-url"
                    type="url"
                    value={brandSettings.termsOfServiceUrl}
                    onChange={(e) =>
                      setBrandSettings({ ...brandSettings, termsOfServiceUrl: e.target.value })
                    }
                    onBlur={() =>
                      updateSettingsMutation.mutate({ termsOfServiceUrl: brandSettings.termsOfServiceUrl })
                    }
                    placeholder="https://example.com/terms"
                    data-testid="input-terms-url"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Preview Card */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Where Your Branding Appears
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Your brand settings will be automatically applied to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Embeddable booking widgets</li>
                <li>Customer receipts and invoices</li>
                <li>Email notifications</li>
                <li>Thank you pages</li>
                <li>Public booking and purchase pages</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Subscription & Billing</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage your GolfSimOS subscription
            </p>

            <div className="space-y-6">
              <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base">Subscription Status</Label>
                  <p className="text-2xl font-bold capitalize" data-testid="text-subscription-status">
                    {facility?.subscriptionStatus || "unknown"}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <Label className="text-base">Monthly Rate</Label>
                  <p className="text-2xl font-bold" data-testid="text-subscription-rate">
                    $199
                  </p>
                </div>
              </div>

              {facility?.subscriptionStatus === "trialing" && facility?.trialEndAt && (() => {
                const trialEnd = new Date(facility.trialEndAt);
                const now = new Date();
                const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysRemaining <= 3;
                const isWarning = daysRemaining <= 7 && daysRemaining > 3;
                
                return (
                  <div 
                    className={`p-4 border rounded-lg ${
                      isUrgent 
                        ? 'bg-destructive/10 border-destructive/20' 
                        : 'bg-amber-500/10 border-amber-500/20'
                    }`}
                    data-testid="container-trial-info"
                  >
                    <div className="flex items-start gap-3">
                      <Clock className={`w-5 h-5 mt-0.5 ${
                        isUrgent ? 'text-destructive' : 'text-amber-600'
                      }`} />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <Label className={`text-base ${
                            isUrgent 
                              ? 'text-destructive dark:text-destructive' 
                              : 'text-amber-900 dark:text-amber-100'
                          }`}>Free Trial Active</Label>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              isUrgent ? 'text-destructive' : 'text-amber-600'
                            }`} data-testid="text-days-remaining">
                              {daysRemaining}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {daysRemaining === 1 ? 'day left' : 'days left'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm ${
                          isUrgent 
                            ? 'text-destructive/90 dark:text-destructive/90' 
                            : 'text-amber-800 dark:text-amber-200'
                        }`} data-testid="text-trial-end-date">
                          {daysRemaining === 0 
                            ? "Your trial ends today" 
                            : daysRemaining === 1
                            ? "Your trial ends tomorrow"
                            : `Your trial ends on ${trialEnd.toLocaleDateString()}`}. 
                          {' '}Add a payment method to continue using GolfSimOS.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {facility?.stripeCustomerId && (
                <div className="space-y-2">
                  <Label>Stripe Customer ID</Label>
                  <Input
                    value={facility.stripeCustomerId}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-stripe-customer-id"
                  />
                </div>
              )}

              {facility?.stripeSubscriptionId && (
                <div className="space-y-2">
                  <Label>Stripe Subscription ID</Label>
                  <Input
                    value={facility.stripeSubscriptionId}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-stripe-subscription-id"
                  />
                </div>
              )}

              <div className="pt-4 border-t">
                <Button 
                  size="lg" 
                  className="w-full"
                  data-testid="button-manage-billing"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {facility?.subscriptionStatus === "trialing" ? "Add Payment Method" : "Manage Billing"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Billing is powered by Stripe
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6 hover-elevate cursor-pointer" asChild>
              <Link href="/bays">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Bays</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your simulator bays, pricing, and availability
                    </p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </Card>
            
            <Card className="p-6 hover-elevate cursor-pointer" asChild>
              <Link href="/trackman-settings">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Radio className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">TrackMan Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure TrackMan OAuth and bay mappings
                    </p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </Card>
          </div>
        </TabsContent>

        <CommunicationTab facilityId={facilityId} />
      </Tabs>
    </div>
  );
}
