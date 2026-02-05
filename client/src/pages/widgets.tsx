import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Eye,
  Copy,
  Check,
  Settings,
  Palette,
  Zap,
  ExternalLink,
  Smartphone,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookingWidget } from "@/components/booking/booking-widget";
import type { BookingWidgetConfig } from "@/components/booking/booking-widget";

/**
 * Widget Configuration & Embed Code Generator
 *
 * Allows facility owners to:
 * - Customize widget appearance (colors, branding)
 * - Configure booking settings
 * - Preview widget
 * - Generate embed code
 * - Copy embed code for their website
 */

export default function WidgetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Widget configuration state
  const [config, setConfig] = useState<BookingWidgetConfig>({
    facilityId: user?.facilityId || 1,
    facilityName: "Golf Simulator",
    logo: undefined,
    primaryColor: "#4CAF50",
    accentColor: "#FF9800",
    showPricing: true,
    requirePhone: true,
    allowGuestCheckout: true,
    depositAmount: 25,
    depositType: "fixed",
  });

  const { data: facilityData } = useQuery({
    queryKey: ["/api/facilities", user?.facilityId],
    enabled: !!user?.facilityId,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/facilities/${user?.facilityId}/widget-config`, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId] });
      toast({ title: "Widget configuration saved" });
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    },
  });

  // Generate embed code
  const generateEmbedCode = () => {
    const params = new URLSearchParams({
      facilityId: config.facilityId.toString(),
      ...(config.primaryColor && { primaryColor: config.primaryColor }),
      ...(config.accentColor && { accentColor: config.accentColor }),
      ...(config.showPricing !== undefined && { showPricing: config.showPricing.toString() }),
      ...(config.requirePhone !== undefined && { requirePhone: config.requirePhone.toString() }),
      ...(config.allowGuestCheckout !== undefined && {
        allowGuestCheckout: config.allowGuestCheckout.toString(),
      }),
      ...(config.depositAmount && { depositAmount: config.depositAmount.toString() }),
      ...(config.depositType && { depositType: config.depositType }),
    });

    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/widget/booking?${params.toString()}`;

    return `<iframe
  src="${embedUrl}"
  width="100%"
  height="800px"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="Book a Golf Simulator Session"
></iframe>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    toast({ title: "Embed code copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const getPreviewUrl = () => {
    const params = new URLSearchParams({
      facilityId: config.facilityId.toString(),
      primaryColor: config.primaryColor || "#4CAF50",
    });
    return `/widget/booking?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking Widget</h1>
        <p className="text-muted-foreground">
          Customize and embed your booking widget on your website
        </p>
      </div>

      <Tabs defaultValue="configure" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configure">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="embed">
            <Code2 className="w-4 h-4 mr-2" />
            Embed Code
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Branding Section */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding & Design
              </h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="facilityName">Facility Name</Label>
                  <Input
                    id="facilityName"
                    value={config.facilityName}
                    onChange={(e) =>
                      setConfig({ ...config, facilityName: e.target.value })
                    }
                    placeholder="Your Facility Name"
                  />
                </div>

                <div>
                  <Label htmlFor="logo">Logo URL (Optional)</Label>
                  <Input
                    id="logo"
                    value={config.logo || ""}
                    onChange={(e) => setConfig({ ...config, logo: e.target.value || undefined })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Direct link to your logo image
                  </p>
                </div>

                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) =>
                        setConfig({ ...config, primaryColor: e.target.value })
                      }
                      className="w-20"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) =>
                        setConfig({ ...config, primaryColor: e.target.value })
                      }
                      placeholder="#4CAF50"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={config.accentColor}
                      onChange={(e) =>
                        setConfig({ ...config, accentColor: e.target.value })
                      }
                      className="w-20"
                    />
                    <Input
                      value={config.accentColor}
                      onChange={(e) =>
                        setConfig({ ...config, accentColor: e.target.value })
                      }
                      placeholder="#FF9800"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Booking Settings */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Booking Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Pricing</Label>
                    <p className="text-xs text-muted-foreground">
                      Display prices in the widget
                    </p>
                  </div>
                  <Switch
                    checked={config.showPricing}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, showPricing: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Phone Number</Label>
                    <p className="text-xs text-muted-foreground">
                      Make phone field mandatory
                    </p>
                  </div>
                  <Switch
                    checked={config.requirePhone}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, requirePhone: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Guest Checkout</Label>
                    <p className="text-xs text-muted-foreground">
                      Book without creating account
                    </p>
                  </div>
                  <Switch
                    checked={config.allowGuestCheckout}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, allowGuestCheckout: checked })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="depositAmount">Deposit Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="depositAmount"
                      type="number"
                      value={config.depositAmount || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          depositAmount: parseFloat(e.target.value) || undefined,
                        })
                      }
                      placeholder="25"
                      className="flex-1"
                    />
                    <Select
                      value={config.depositType}
                      onValueChange={(value: "fixed" | "percentage") =>
                        setConfig({ ...config, depositType: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed ($)</SelectItem>
                        <SelectItem value="percentage">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional deposit to secure booking
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => saveConfigMutation.mutate()} disabled={saveConfigMutation.isPending}>
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
            <Button variant="outline" asChild>
              <a href={getPreviewUrl()} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Live Preview</h3>
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={previewMode === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Desktop
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile
              </Button>
            </div>
          </div>

          <div className="flex justify-center bg-muted/30 p-8 rounded-lg">
            <div
              className={`transition-all ${
                previewMode === "desktop" ? "w-full max-w-6xl" : "w-[375px]"
              }`}
            >
              <div className="bg-white rounded-lg shadow-xl">
                <BookingWidget config={config} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Embed Code Tab */}
        <TabsContent value="embed" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Embed Code</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Copy and paste this code into your website where you want the booking widget to appear.
            </p>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generateEmbedCode()}</code>
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyEmbedCode}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <h4 className="font-semibold mb-2 text-blue-900">Installation Instructions</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Copy the embed code above</li>
              <li>Paste it into your website's HTML where you want the widget</li>
              <li>The widget will automatically load and display your booking calendar</li>
              <li>Customers can book directly from your website!</li>
            </ol>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">WordPress</Badge>
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add to any page or post using the HTML block:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Edit your page in WordPress</li>
                <li>Add a "Custom HTML" block</li>
                <li>Paste the embed code</li>
                <li>Publish!</li>
              </ol>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">Wix / Squarespace</Badge>
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add using the embed/code component:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Add an "Embed Code" element</li>
                <li>Paste the iframe code</li>
                <li>Adjust the height if needed</li>
                <li>Save and publish!</li>
              </ol>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Widget Analytics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Views This Month</p>
          </div>
          <div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Bookings Started</p>
          </div>
          <div>
            <p className="text-2xl font-bold">--%</p>
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
