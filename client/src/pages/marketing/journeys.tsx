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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Route,
  Plus,
  Play,
  Pause,
  MoreVertical,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  Users,
  Trash2,
  Edit,
  Copy,
  ArrowRight,
  Loader2,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Journey {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused";
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  steps: JourneyStep[];
  enrollmentCount: number;
  createdAt: string;
}

interface JourneyStep {
  id: string;
  type: "email" | "sms" | "delay" | "condition" | "tag_action";
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

const triggerTypes = [
  { value: "membership_joined", label: "Membership Joined", icon: Users },
  { value: "booking_completed", label: "Booking Completed", icon: Zap },
  { value: "product_purchased", label: "Product Purchased", icon: Zap },
  { value: "tag_assigned", label: "Tag Assigned", icon: Tag },
  { value: "billing_expiring", label: "Billing Expiring", icon: Clock },
  { value: "membership_expiring", label: "Membership Expiring", icon: Clock },
  { value: "contact_created", label: "Contact Created", icon: Users },
  { value: "form_submitted", label: "Form Submitted", icon: Zap },
];

export default function JourneysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newJourneyName, setNewJourneyName] = useState("");
  const [newJourneyDescription, setNewJourneyDescription] = useState("");
  const [newJourneyTrigger, setNewJourneyTrigger] = useState("");

  const { data: journeys = [], isLoading } = useQuery<Journey[]>({
    queryKey: ["/api/facilities", user?.facilityId, "marketing/journeys"],
    enabled: !!user?.facilityId,
  });

  const createJourneyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/facilities/${user?.facilityId}/marketing/journeys`, {
        name: newJourneyName,
        description: newJourneyDescription,
        triggerType: newJourneyTrigger,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/journeys"] });
      setIsCreateDialogOpen(false);
      setNewJourneyName("");
      setNewJourneyDescription("");
      setNewJourneyTrigger("");
      toast({ title: "Journey created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create journey", variant: "destructive" });
    },
  });

  const toggleJourneyStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/facilities/${user?.facilityId}/marketing/journeys/${id}`, {
        status: status === "active" ? "paused" : "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/journeys"] });
      toast({ title: "Journey status updated" });
    },
  });

  const deleteJourneyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/facilities/${user?.facilityId}/marketing/journeys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/journeys"] });
      toast({ title: "Journey deleted" });
    },
  });

  const openJourneyEditor = (journey: Journey) => {
    setSelectedJourney(journey);
    setIsEditorOpen(true);
  };

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
          <h1 className="text-3xl font-bold" data-testid="text-journeys-title">Journeys</h1>
          <p className="text-muted-foreground">
            Create automated email and SMS sequences triggered by customer actions
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-journey">
          <Plus className="w-4 h-4 mr-2" />
          Create Journey
        </Button>
      </div>

      {journeys.length === 0 ? (
        <Card className="p-12 text-center">
          <Route className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Journeys Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first automated journey to engage customers with personalized email and SMS sequences.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Journey
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {journeys.map((journey) => (
            <Card key={journey.id} className="p-4" data-testid={`card-journey-${journey.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Route className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{journey.name}</h3>
                      <Badge
                        variant={
                          journey.status === "active"
                            ? "default"
                            : journey.status === "paused"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {journey.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {journey.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {triggerTypes.find((t) => t.value === journey.triggerType)?.label || journey.triggerType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {journey.enrollmentCount || 0} enrolled
                      </span>
                      <span>
                        {journey.steps?.length || 0} steps
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleJourneyStatusMutation.mutate({ id: journey.id, status: journey.status })}
                    disabled={journey.status === "draft"}
                    data-testid={`button-toggle-journey-${journey.id}`}
                  >
                    {journey.status === "active" ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openJourneyEditor(journey)}
                    data-testid={`button-edit-journey-${journey.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openJourneyEditor(journey)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Journey
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteJourneyMutation.mutate(journey.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Journey Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Journey</DialogTitle>
            <DialogDescription>
              Set up an automated sequence triggered by customer actions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="journey-name">Journey Name</Label>
              <Input
                id="journey-name"
                placeholder="e.g., Welcome New Members"
                value={newJourneyName}
                onChange={(e) => setNewJourneyName(e.target.value)}
                data-testid="input-journey-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="journey-description">Description</Label>
              <Input
                id="journey-description"
                placeholder="Describe the purpose of this journey"
                value={newJourneyDescription}
                onChange={(e) => setNewJourneyDescription(e.target.value)}
                data-testid="input-journey-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={newJourneyTrigger} onValueChange={setNewJourneyTrigger}>
                <SelectTrigger data-testid="select-journey-trigger">
                  <SelectValue placeholder="Select what starts this journey" />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="w-4 h-4" />
                        {trigger.label}
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
              onClick={() => createJourneyMutation.mutate()}
              disabled={!newJourneyName || !newJourneyTrigger || createJourneyMutation.isPending}
              data-testid="button-confirm-create-journey"
            >
              {createJourneyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Journey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journey Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Journey: {selectedJourney?.name}</DialogTitle>
            <DialogDescription>
              Drag and drop elements to build your automation workflow
            </DialogDescription>
          </DialogHeader>
          <JourneyEditor journey={selectedJourney} onClose={() => setIsEditorOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface JourneyEditorProps {
  journey: Journey | null;
  onClose: () => void;
}

function JourneyEditor({ journey, onClose }: JourneyEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [steps, setSteps] = useState<JourneyStep[]>(journey?.steps || []);
  const [selectedStep, setSelectedStep] = useState<JourneyStep | null>(null);

  const stepTypes = [
    { type: "email", label: "Send Email", icon: Mail, color: "bg-blue-100 text-blue-600" },
    { type: "sms", label: "Send SMS", icon: MessageSquare, color: "bg-green-100 text-green-600" },
    { type: "delay", label: "Wait/Delay", icon: Clock, color: "bg-amber-100 text-amber-600" },
    { type: "tag_action", label: "Add/Remove Tag", icon: Tag, color: "bg-purple-100 text-purple-600" },
  ];

  const addStep = (type: string) => {
    const newStep: JourneyStep = {
      id: `step_${Date.now()}`,
      type: type as JourneyStep["type"],
      config: {},
      position: { x: 100, y: steps.length * 120 + 100 },
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/facilities/${user?.facilityId}/marketing/journeys/${journey?.id}`, {
        steps,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/journeys"] });
      toast({ title: "Journey saved successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to save journey", variant: "destructive" });
    },
  });

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar - Step Types */}
      <div className="w-48 border-r pr-4">
        <h4 className="font-semibold mb-3 text-sm">Add Step</h4>
        <div className="space-y-2">
          {stepTypes.map((stepType) => (
            <button
              key={stepType.type}
              onClick={() => addStep(stepType.type)}
              className="w-full flex items-center gap-2 p-2 rounded-md border hover-elevate active-elevate-2 text-sm"
              data-testid={`button-add-step-${stepType.type}`}
            >
              <div className={`p-1 rounded ${stepType.color}`}>
                <stepType.icon className="w-4 h-4" />
              </div>
              {stepType.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-muted/30 rounded-lg p-4 overflow-auto">
        {/* Trigger Node */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" />
            <span className="font-medium">
              {triggerTypes.find((t) => t.value === journey?.triggerType)?.label || "Trigger"}
            </span>
          </div>
          
          {steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add steps from the sidebar to build your journey</p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => {
                const stepType = stepTypes.find((s) => s.type === step.type);
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    {index > 0 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90 my-2" />
                    )}
                    <Card
                      className={`p-3 min-w-[200px] cursor-pointer border-2 ${
                        selectedStep?.id === step.id ? "border-primary" : "border-transparent"
                      }`}
                      onClick={() => setSelectedStep(step)}
                      data-testid={`step-${step.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${stepType?.color}`}>
                            {stepType && <stepType.icon className="w-4 h-4" />}
                          </div>
                          <span className="font-medium text-sm">{stepType?.label}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStep(step.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {step.type === "email" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(step.config as { subject?: string }).subject || "No subject configured"}
                        </p>
                      )}
                      {step.type === "delay" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Wait {(step.config as { days?: number }).days || 1} day(s)
                        </p>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step Configuration Panel */}
      {selectedStep && (
        <div className="w-64 border-l pl-4">
          <h4 className="font-semibold mb-3">Configure Step</h4>
          <StepConfigPanel
            step={selectedStep}
            onUpdate={(config) => {
              setSteps(
                steps.map((s) =>
                  s.id === selectedStep.id ? { ...s, config } : s
                )
              );
              setSelectedStep({ ...selectedStep, config });
            }}
          />
        </div>
      )}

      {/* Save Button */}
      <div className="absolute bottom-4 right-4">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-journey"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Journey
        </Button>
      </div>
    </div>
  );
}

interface StepConfigPanelProps {
  step: JourneyStep;
  onUpdate: (config: Record<string, unknown>) => void;
}

function StepConfigPanel({ step, onUpdate }: StepConfigPanelProps) {
  const config = step.config as Record<string, unknown>;

  if (step.type === "email") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Subject Line</Label>
          <Input
            placeholder="Email subject"
            value={(config.subject as string) || ""}
            onChange={(e) => onUpdate({ ...config, subject: e.target.value })}
            data-testid="input-email-subject"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Template</Label>
          <Select
            value={(config.templateId as string) || ""}
            onValueChange={(value) => onUpdate({ ...config, templateId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Welcome Email</SelectItem>
              <SelectItem value="reminder">Reminder Email</SelectItem>
              <SelectItem value="custom">Custom Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="w-full">
          <Edit className="w-4 h-4 mr-2" />
          Edit Email Content
        </Button>
      </div>
    );
  }

  if (step.type === "sms") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Message</Label>
          <textarea
            className="w-full p-2 text-sm border rounded-md resize-none"
            rows={3}
            placeholder="SMS message content"
            value={(config.message as string) || ""}
            onChange={(e) => onUpdate({ ...config, message: e.target.value })}
            data-testid="input-sms-message"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {160 - ((config.message as string)?.length || 0)} characters remaining
        </p>
      </div>
    );
  }

  if (step.type === "delay") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Wait Duration</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={(config.days as number) || 1}
              onChange={(e) => onUpdate({ ...config, days: parseInt(e.target.value) || 1 })}
              className="w-20"
              data-testid="input-delay-days"
            />
            <Select
              value={(config.unit as string) || "days"}
              onValueChange={(value) => onUpdate({ ...config, unit: value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  if (step.type === "tag_action") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select
            value={(config.action as string) || "add"}
            onValueChange={(value) => onUpdate({ ...config, action: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add Tag</SelectItem>
              <SelectItem value="remove">Remove Tag</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tag Name</Label>
          <Input
            placeholder="Enter tag name"
            value={(config.tag as string) || ""}
            onChange={(e) => onUpdate({ ...config, tag: e.target.value })}
            data-testid="input-tag-name"
          />
        </div>
      </div>
    );
  }

  return null;
}
