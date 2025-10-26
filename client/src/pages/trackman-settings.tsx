import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, CheckCircle2, XCircle, Radio } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Bay = {
  id: string;
  name: string;
  description: string | null;
  trackmanUnitId: string | null;
  status: string;
};

export default function TrackmanSettings() {
  const { toast } = useToast();
  const [editedBays, setEditedBays] = useState<Record<string, string>>({});

  // Fetch all bays
  const { data: bays, isLoading } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  // Update bay mutation
  const updateBayMutation = useMutation({
    mutationFn: async ({ bayId, trackmanUnitId }: { bayId: string; trackmanUnitId: string }) => {
      return apiRequest(`/api/bays/${bayId}`, {
        method: "PATCH",
        body: JSON.stringify({ trackmanUnitId: trackmanUnitId || null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bays"] });
      setEditedBays({});
      toast({
        title: "Settings saved",
        description: "TrackMan unit mappings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUnitIdChange = (bayId: string, value: string) => {
    setEditedBays(prev => ({
      ...prev,
      [bayId]: value,
    }));
  };

  const handleSave = async () => {
    // Save all edited bays
    const updates = Object.entries(editedBays).map(([bayId, trackmanUnitId]) => 
      updateBayMutation.mutateAsync({ bayId, trackmanUnitId })
    );
    
    await Promise.all(updates);
  };

  const hasChanges = Object.keys(editedBays).length > 0;

  const getConnectionStatus = (bay: Bay) => {
    // For now, just check if unit ID is configured
    // In the future, we could check actual WebSocket connection status
    if (!bay.trackmanUnitId && !editedBays[bay.id]) {
      return { status: 'not-configured', label: 'Not Configured', color: 'secondary' as const };
    }
    return { status: 'configured', label: 'Configured', color: 'default' as const };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="page-title">TrackMan Settings</h1>
        <p className="text-muted-foreground mt-2" data-testid="page-description">
          Configure TrackMan unit identifiers for each bay to enable real-time shot tracking and analytics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bay to TrackMan Unit Mapping</CardTitle>
          <CardDescription>
            Enter the TrackMan unit ID for each bay. These IDs match the <code>bayId</code> or <code>unitId</code> 
            sent by TrackMan in their API responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bays && bays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-bays-message">
              No bays found. Create bays first before configuring TrackMan units.
            </div>
          ) : (
            <div className="space-y-4">
              {bays?.map((bay) => {
                const currentValue = editedBays[bay.id] !== undefined 
                  ? editedBays[bay.id] 
                  : (bay.trackmanUnitId || '');
                const connectionStatus = getConnectionStatus(bay);

                return (
                  <div 
                    key={bay.id} 
                    className="flex items-start gap-4 p-4 border rounded-lg hover-elevate"
                    data-testid={`bay-config-${bay.id}`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`unit-${bay.id}`} className="font-semibold">
                          {bay.name}
                        </Label>
                        <Badge variant={connectionStatus.color} data-testid={`status-${bay.id}`}>
                          {connectionStatus.status === 'configured' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Radio className="h-3 w-3 mr-1" />
                          )}
                          {connectionStatus.label}
                        </Badge>
                      </div>
                      {bay.description && (
                        <p className="text-sm text-muted-foreground">{bay.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          id={`unit-${bay.id}`}
                          placeholder="e.g., TM-001, BAY_A, or unit-12345"
                          value={currentValue}
                          onChange={(e) => handleUnitIdChange(bay.id, e.target.value)}
                          className="max-w-md"
                          data-testid={`input-unit-${bay.id}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {bays && bays.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {hasChanges ? `${Object.keys(editedBays).length} unsaved change(s)` : 'All changes saved'}
              </p>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateBayMutation.isPending}
                data-testid="button-save"
              >
                {updateBayMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Find Your TrackMan Unit IDs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>From TrackMan Dashboard:</strong> Your TrackMan unit IDs are typically visible in your 
            TrackMan facility dashboard or device settings.
          </p>
          <p>
            <strong>From API Data:</strong> When you first connect to TrackMan's API, the <code>bayId</code> or 
            <code>unitId</code> field in session/shot data shows the identifier for each unit.
          </p>
          <p>
            <strong>Format Examples:</strong> Unit IDs can be formatted as <code>TM-001</code>, <code>BAY_A</code>, 
            <code>unit-12345</code>, or any identifier TrackMan uses for your specific units.
          </p>
          <p className="text-muted-foreground">
            Once configured, all shot data from that TrackMan unit will automatically be associated with the 
            correct bay in your system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
