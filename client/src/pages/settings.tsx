import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings as SettingsIcon, Copy, ExternalLink, Code, Calendar } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const facilityId = user?.facilityId || "";

  const { data: facility, isLoading } = useQuery<any>({
    queryKey: ["/api/facility"],
    enabled: !!facilityId,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/facility`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
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
          <TabsTrigger value="general" data-testid="tab-general">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Booking Options</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure how members can book lessons and club fittings
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
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
