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
  FileText,
  Plus,
  Copy,
  ExternalLink,
  Loader2,
  Code,
  Eye,
  Settings,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LeadForm {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  fields: FormField[];
  submissions: number;
  conversionRate: number;
  embedCode: string;
  createdAt: string;
}

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "checkbox";
  label: string;
  required: boolean;
  options?: string[];
}

const defaultFields: FormField[] = [
  { id: "name", type: "text", label: "Full Name", required: true },
  { id: "email", type: "email", label: "Email", required: true },
  { id: "phone", type: "phone", label: "Phone Number", required: false },
];

export default function FormsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<LeadForm | null>(null);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [newFormType, setNewFormType] = useState("");

  const { data: forms = [], isLoading } = useQuery<LeadForm[]>({
    queryKey: ["/api/facilities", user?.facilityId, "marketing/forms"],
    enabled: !!user?.facilityId,
  });

  const createFormMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/facilities/${user?.facilityId}/marketing/forms`, {
        name: newFormName,
        description: newFormDescription,
        type: newFormType,
        fields: defaultFields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", user?.facilityId, "marketing/forms"] });
      setIsCreateDialogOpen(false);
      setNewFormName("");
      setNewFormDescription("");
      setNewFormType("");
      toast({ title: "Form created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create form", variant: "destructive" });
    },
  });

  const copyEmbedCode = (embedCode: string) => {
    navigator.clipboard.writeText(embedCode);
    toast({ title: "Embed code copied to clipboard" });
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
          <h1 className="text-3xl font-bold" data-testid="text-forms-title">Forms & Landing Pages</h1>
          <p className="text-muted-foreground">
            Create embeddable forms for lead generation and customer signups
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-form">
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Active Forms</span>
          </div>
          <p className="text-2xl font-bold">{forms.filter((f) => f.status === "active").length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Submissions</span>
          </div>
          <p className="text-2xl font-bold">{forms.reduce((sum, f) => sum + f.submissions, 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Avg Conversion</span>
          </div>
          <p className="text-2xl font-bold">
            {forms.length > 0
              ? Math.round(forms.reduce((sum, f) => sum + f.conversionRate, 0) / forms.length)
              : 0}%
          </p>
        </Card>
      </div>

      {forms.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Forms Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create embeddable forms to capture leads from your website or landing pages.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Form
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="p-4" data-testid={`card-form-${form.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <Badge variant={form.status === "active" ? "default" : "secondary"}>
                    {form.status}
                  </Badge>
                </div>
              </div>
              <h3 className="font-semibold mb-1">{form.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {form.description || "No description"}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span>{form.fields?.length || 0} fields</span>
                <span>{form.submissions} submissions</span>
                <span>{form.conversionRate}% conversion</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedForm(form);
                    setIsEmbedDialogOpen(true);
                  }}
                >
                  <Code className="w-4 h-4 mr-1" />
                  Embed
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>
              Create an embeddable form for lead generation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                placeholder="e.g., Free Trial Signup"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                data-testid="input-form-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-description">Description</Label>
              <Input
                id="form-description"
                placeholder="What is this form for?"
                value={newFormDescription}
                onChange={(e) => setNewFormDescription(e.target.value)}
                data-testid="input-form-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Form Type</Label>
              <Select value={newFormType} onValueChange={setNewFormType}>
                <SelectTrigger data-testid="select-form-type">
                  <SelectValue placeholder="Select form type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_capture">Lead Capture</SelectItem>
                  <SelectItem value="contact_us">Contact Us</SelectItem>
                  <SelectItem value="newsletter">Newsletter Signup</SelectItem>
                  <SelectItem value="free_trial">Free Trial Request</SelectItem>
                  <SelectItem value="booking_inquiry">Booking Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createFormMutation.mutate()}
              disabled={!newFormName || !newFormType || createFormMutation.isPending}
              data-testid="button-confirm-create-form"
            >
              {createFormMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Form: {selectedForm?.name}</DialogTitle>
            <DialogDescription>
              Copy and paste this code into your website to display the form
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
              <pre>{selectedForm?.embedCode || `<script src="https://yoursite.com/forms/${selectedForm?.id}/embed.js"></script>
<div id="golfsimos-form-${selectedForm?.id}"></div>`}</pre>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => copyEmbedCode(selectedForm?.embedCode || "")}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Embed Code
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Preview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
