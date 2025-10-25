import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, Plus, Mail, Phone, Building2, Calendar, DollarSign, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { format } from "date-fns";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  source: string;
  notes?: string;
  estimatedValue?: string;
  assignedTo?: string;
  nextFollowUp?: string;
  lastContactedAt?: string;
  convertedToUserId?: string;
  convertedAt?: string;
  createdAt: string;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  membershipTierId?: string;
  createdAt: string;
};

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.string(),
  source: z.string(),
  notes: z.string().optional(),
  estimatedValue: z.string().optional(),
  nextFollowUp: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

export default function ContactsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "customers">("leads");
  const { toast } = useToast();

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/members"],
  });

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      status: "new",
      source: "website",
      notes: "",
      estimatedValue: "",
      nextFollowUp: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      return apiRequest("/api/leads", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Created",
        description: "New lead has been added successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeadFormData> }) => {
      return apiRequest(`/api/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Updated",
        description: "Lead has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingLead(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: LeadFormData) => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    form.reset({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone || "",
      company: lead.company || "",
      status: lead.status,
      source: lead.source,
      notes: lead.notes || "",
      estimatedValue: lead.estimatedValue || "",
      nextFollowUp: lead.nextFollowUp ? format(new Date(lead.nextFollowUp), "yyyy-MM-dd") : "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingLead(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "qualified": return "default";
      case "proposal": return "default";
      case "negotiation": return "default";
      case "won": return "default";
      case "lost": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts & CRM</h1>
          <p className="text-muted-foreground mt-1">
            Manage leads, prospects, and customer relationships
          </p>
        </div>
        {activeTab === "leads" && (
          <Button onClick={handleAddNew} data-testid="button-add-lead">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "leads" ? "default" : "outline"}
          onClick={() => setActiveTab("leads")}
          data-testid="tab-leads"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Leads ({leads.length})
        </Button>
        <Button
          variant={activeTab === "customers" ? "default" : "outline"}
          onClick={() => setActiveTab("customers")}
          data-testid="tab-customers"
        >
          <Users className="w-4 h-4 mr-2" />
          Customers ({customers.length})
        </Button>
      </div>

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <Card className="overflow-hidden">
          {leadsLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Leads Yet</h3>
              <p className="text-muted-foreground mb-4">Start adding leads to track your sales pipeline.</p>
              <Button onClick={handleAddNew} data-testid="button-add-first-lead">
                <Plus className="w-4 h-4 mr-2" />
                Add First Lead
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleEdit(lead)}
                  data-testid={`lead-${lead.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {lead.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </div>
                            )}
                            {lead.company && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {lead.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-13">
                        <Badge variant={getStatusColor(lead.status)}>
                          {getStatusLabel(lead.status)}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {lead.source.replace("_", " ")}
                        </Badge>
                        {lead.estimatedValue && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${lead.estimatedValue}
                          </Badge>
                        )}
                      </div>

                      {lead.notes && (
                        <p className="text-sm text-muted-foreground mt-2 ml-13 line-clamp-2">
                          {lead.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <div>Added {format(new Date(lead.createdAt), "MMM d, yyyy")}</div>
                      {lead.nextFollowUp && (
                        <div className="flex items-center gap-1 justify-end mt-1 text-primary">
                          <Calendar className="w-3 h-3" />
                          Follow-up: {format(new Date(lead.nextFollowUp), "MMM d")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Customers Tab */}
      {activeTab === "customers" && (
        <Card className="overflow-hidden">
          {customersLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Customers Yet</h3>
              <p className="text-muted-foreground">Customers will appear here once they create accounts.</p>
            </div>
          ) : (
            <div className="divide-y">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`customer-${customer.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="secondary" className="capitalize mb-2">
                        {customer.role.replace("_", " ")}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Joined {format(new Date(customer.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
            <DialogDescription>
              {editingLead ? "Update lead information" : "Add a new lead to your CRM"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="walk_in">Walk-in</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Value ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-estimated-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextFollowUp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Follow-up</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-next-followup" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingLead(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-lead"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingLead
                    ? "Update Lead"
                    : "Create Lead"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
