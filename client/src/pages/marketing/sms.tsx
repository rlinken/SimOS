import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Plus,
  Send,
  Users,
  Calendar,
  Loader2,
  Phone,
  Shield,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  segmentId: string;
  recipientCount: number;
  deliveredCount: number;
  sentAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

interface ConsentStats {
  total: number;
  optedIn: number;
  optedOut: number;
}

export default function SMSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignMessage, setNewCampaignMessage] = useState("");
  const [newCampaignSegment, setNewCampaignSegment] = useState("");

  const { data: campaigns = [], isLoading } = useQuery<SMSCampaign[]>({
    queryKey: ["/api/facilities", user?.facilityId, "marketing/sms-campaigns"],
    enabled: !!user?.facilityId,
  });

  const { data: consentStats } = useQuery<ConsentStats>({
    queryKey: ["/api/facilities", user?.facilityId, "marketing/sms-consent-stats"],
    enabled: !!user?.facilityId,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/facilities/${user?.facilityId}/marketing/sms-campaigns`, {
        name: newCampaignName,
        message: newCampaignMessage,
        segmentId: newCampaignSegment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/sms-campaigns"] });
      setIsCreateDialogOpen(false);
      setNewCampaignName("");
      setNewCampaignMessage("");
      setNewCampaignSegment("");
      toast({ title: "SMS campaign created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-sms-title">SMS Broadcasting</h1>
          <p className="text-muted-foreground">
            Send targeted SMS messages to opted-in customers
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-sms-campaign">
          <Plus className="w-4 h-4 mr-2" />
          Create SMS Campaign
        </Button>
      </div>

      {/* Consent Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Contacts</span>
          </div>
          <p className="text-2xl font-bold">{consentStats?.total || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">SMS Opted In</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{consentStats?.optedIn || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Opted Out</span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground">{consentStats?.optedOut || 0}</p>
        </Card>
      </div>

      {/* Compliance Notice */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">TCPA Compliance</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              SMS messages are only sent to customers who have explicitly opted in to receive text messages.
              Consent is collected during booking and contact signup. Customers can opt out at any time by replying STOP.
            </p>
          </div>
        </div>
      </Card>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No SMS Campaigns Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first SMS campaign to send targeted messages to opted-in customers.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First SMS Campaign
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">SMS Campaigns</h3>
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="p-4" data-testid={`card-sms-campaign-${campaign.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <Badge
                          variant={
                            campaign.status === "sent"
                              ? "default"
                              : campaign.status === "sending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {campaign.message}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {campaign.recipientCount} recipients
                        </span>
                        {campaign.sentAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Sent {format(new Date(campaign.sentAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {campaign.status === "sent" && (
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {Math.round((campaign.deliveredCount / campaign.recipientCount) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Delivery Rate</p>
                      </div>
                    )}
                    {campaign.status === "draft" && (
                      <Button size="sm" data-testid={`button-send-sms-${campaign.id}`}>
                        <Send className="w-4 h-4 mr-1" />
                        Send Now
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create SMS Campaign Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create SMS Campaign</DialogTitle>
            <DialogDescription>
              Send a targeted SMS to opted-in customers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Weekend Special Reminder"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                data-testid="input-sms-campaign-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-message">Message</Label>
              <textarea
                id="campaign-message"
                className="w-full p-3 text-sm border rounded-md resize-none"
                rows={4}
                placeholder="Type your SMS message here..."
                value={newCampaignMessage}
                onChange={(e) => setNewCampaignMessage(e.target.value)}
                maxLength={160}
                data-testid="input-sms-campaign-message"
              />
              <p className="text-xs text-muted-foreground">
                {160 - newCampaignMessage.length} characters remaining
              </p>
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={newCampaignSegment} onValueChange={setNewCampaignSegment}>
                <SelectTrigger data-testid="select-sms-segment">
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_opted_in">All SMS Opted-In</SelectItem>
                  <SelectItem value="active_members">Active Members (Opted-In)</SelectItem>
                  <SelectItem value="upcoming_bookings">Upcoming Bookings</SelectItem>
                  <SelectItem value="inactive_30days">Inactive 30 Days (Opted-In)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCampaignMutation.mutate()}
              disabled={!newCampaignName || !newCampaignMessage || !newCampaignSegment || createCampaignMutation.isPending}
              data-testid="button-confirm-create-sms-campaign"
            >
              {createCampaignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
