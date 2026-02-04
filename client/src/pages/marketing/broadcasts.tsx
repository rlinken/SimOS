import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Megaphone,
  Plus,
  Send,
  Users,
  Calendar,
  Loader2,
  Mail,
  BarChart3,
  Eye,
  MousePointer,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Broadcast {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  segmentId: string;
  segmentName: string;
  recipientCount: number;
  sentAt: string | null;
  scheduledAt: string | null;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  contactCount: number;
}

const predefinedSegments = [
  { id: "all", name: "All Contacts", description: "Everyone in your contact list", contactCount: 0 },
  { id: "active_members", name: "Active Members", description: "Members with active subscriptions", contactCount: 0 },
  { id: "expiring_soon", name: "Expiring Soon", description: "Members expiring in 30 days", contactCount: 0 },
  { id: "lapsed_members", name: "Lapsed Members", description: "Former members who haven't renewed", contactCount: 0 },
  { id: "frequent_bookers", name: "Frequent Bookers", description: "5+ bookings in last 90 days", contactCount: 0 },
  { id: "inactive_30days", name: "Inactive 30 Days", description: "No activity in 30 days", contactCount: 0 },
  { id: "lesson_buyers", name: "Lesson Buyers", description: "Customers who purchased lessons", contactCount: 0 },
  { id: "high_value", name: "High Value Customers", description: "Spent $500+ lifetime", contactCount: 0 },
];

export default function BroadcastsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBroadcastName, setNewBroadcastName] = useState("");
  const [newBroadcastSubject, setNewBroadcastSubject] = useState("");
  const [newBroadcastSegment, setNewBroadcastSegment] = useState("");

  const { data: broadcasts = [], isLoading } = useQuery<Broadcast[]>({
    queryKey: ["/api/facilities", user?.facilityId, "marketing/broadcasts"],
    enabled: !!user?.facilityId,
  });

  const createBroadcastMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/facilities/${user?.facilityId}/marketing/broadcasts`, {
        name: newBroadcastName,
        subject: newBroadcastSubject,
        segmentId: newBroadcastSegment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/broadcasts"] });
      setIsCreateDialogOpen(false);
      setNewBroadcastName("");
      setNewBroadcastSubject("");
      setNewBroadcastSegment("");
      toast({ title: "Broadcast created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create broadcast", variant: "destructive" });
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
          <h1 className="text-3xl font-bold" data-testid="text-broadcasts-title">Broadcasts</h1>
          <p className="text-muted-foreground">
            Send targeted email campaigns to segmented audiences
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-broadcast">
          <Plus className="w-4 h-4 mr-2" />
          Create Broadcast
        </Button>
      </div>

      {/* Segment Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {predefinedSegments.slice(0, 4).map((segment) => (
          <Card key={segment.id} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{segment.name}</span>
            </div>
            <p className="text-2xl font-bold">{segment.contactCount}</p>
            <p className="text-xs text-muted-foreground">{segment.description}</p>
          </Card>
        ))}
      </div>

      {broadcasts.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Broadcasts Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first email broadcast to reach your customers with targeted messages.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Broadcast
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Broadcasts</h3>
          <div className="grid gap-4">
            {broadcasts.map((broadcast) => (
              <Card key={broadcast.id} className="p-4" data-testid={`card-broadcast-${broadcast.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{broadcast.name}</h3>
                        <Badge
                          variant={
                            broadcast.status === "sent"
                              ? "default"
                              : broadcast.status === "sending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {broadcast.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {broadcast.subject}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {broadcast.recipientCount} recipients
                        </span>
                        {broadcast.sentAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Sent {format(new Date(broadcast.sentAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {broadcast.status === "sent" && (
                      <>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-sm">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{broadcast.openRate}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Open Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-sm">
                            <MousePointer className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{broadcast.clickRate}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Click Rate</p>
                        </div>
                      </>
                    )}
                    {broadcast.status === "draft" && (
                      <Button size="sm" data-testid={`button-send-broadcast-${broadcast.id}`}>
                        <Send className="w-4 h-4 mr-1" />
                        Send Now
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <BarChart3 className="w-4 h-4 mr-1" />
                      View Report
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Broadcast Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Broadcast</DialogTitle>
            <DialogDescription>
              Send a targeted email to a segment of your audience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcast-name">Campaign Name</Label>
              <Input
                id="broadcast-name"
                placeholder="e.g., Summer Membership Promotion"
                value={newBroadcastName}
                onChange={(e) => setNewBroadcastName(e.target.value)}
                data-testid="input-broadcast-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broadcast-subject">Email Subject</Label>
              <Input
                id="broadcast-subject"
                placeholder="e.g., Exclusive Summer Offer Just for You!"
                value={newBroadcastSubject}
                onChange={(e) => setNewBroadcastSubject(e.target.value)}
                data-testid="input-broadcast-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={newBroadcastSegment} onValueChange={setNewBroadcastSegment}>
                <SelectTrigger data-testid="select-broadcast-segment">
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedSegments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      <div>
                        <div className="font-medium">{segment.name}</div>
                        <div className="text-xs text-muted-foreground">{segment.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBroadcastMutation.mutate()}
              disabled={!newBroadcastName || !newBroadcastSubject || !newBroadcastSegment || createBroadcastMutation.isPending}
              data-testid="button-confirm-create-broadcast"
            >
              {createBroadcastMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create & Design Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
