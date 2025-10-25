import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Package, Plus, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Offering, User } from "@shared/schema";
import { insertOfferingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const offeringFormSchema = insertOfferingSchema.omit({ facilityId: true });

type OfferingFormData = z.infer<typeof offeringFormSchema>;

type EnrichedOffering = Offering & { assignedStaff?: User };

export default function OfferingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<EnrichedOffering | null>(null);
  const { toast } = useToast();

  const { data: offerings, isLoading } = useQuery<EnrichedOffering[]>({
    queryKey: ["/api/offerings"],
  });

  const { data: staff } = useQuery<User[]>({
    queryKey: ["/api/staff"],
  });

  const form = useForm<OfferingFormData>({
    resolver: zodResolver(offeringFormSchema),
    defaultValues: {
      type: "lesson",
      name: "",
      description: "",
      price: "",
      durationMinutes: undefined,
      assignedStaffId: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: OfferingFormData) => {
      // Transform "none" to undefined for unassigned staff
      const payload = {
        ...data,
        assignedStaffId: data.assignedStaffId === "none" ? undefined : data.assignedStaffId,
      };
      
      if (editingOffering) {
        return apiRequest("PATCH", `/api/offerings/${editingOffering.id}`, payload);
      }
      return apiRequest("POST", "/api/offerings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offerings"] });
      toast({
        title: "Success",
        description: editingOffering
          ? "Offering updated successfully"
          : "Offering created successfully",
      });
      setIsDialogOpen(false);
      setEditingOffering(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/offerings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offerings"] });
      toast({
        title: "Success",
        description: "Offering deleted successfully",
      });
    },
  });

  const handleEdit = (offering: EnrichedOffering) => {
    setEditingOffering(offering);
    form.reset({
      type: offering.type,
      name: offering.name,
      description: offering.description || "",
      price: offering.price,
      durationMinutes: offering.durationMinutes || undefined,
      assignedStaffId: offering.assignedStaffId || undefined,
      isActive: offering.isActive,
    });
    setIsDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "lesson":
        return "Lesson";
      case "fitting":
        return "Club Fitting";
      case "product":
        return "Product";
      case "membership":
        return "Membership";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lesson":
        return "bg-primary/10 text-primary";
      case "fitting":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "product":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "membership":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Products & Services</h1>
        <Card className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Products & Services
          </h1>
          <p className="text-muted-foreground">
            Manage lessons, fittings, products, and memberships
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingOffering(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-offering">
              <Plus className="w-4 h-4 mr-2" />
              Add Offering
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOffering ? "Edit Offering" : "Create New Offering"}
              </DialogTitle>
              <DialogDescription>
                {editingOffering
                  ? "Update offering details"
                  : "Create a new product, service, or membership"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lesson">Lesson</SelectItem>
                            <SelectItem value="fitting">Club Fitting</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="membership">Membership</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignedStaffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Staff (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-staff">
                              <SelectValue placeholder="No staff assigned" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No staff assigned</SelectItem>
                            {staff?.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName} - {member.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 1 Hour Lesson with Nick Duffy"
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Brief description of this offering..."
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes, optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            placeholder="60"
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingOffering(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending
                      ? "Saving..."
                      : editingOffering
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {!offerings || offerings.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No offerings yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first lesson, fitting, product, or membership
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-offering">
            <Plus className="w-4 h-4 mr-2" />
            Add First Offering
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offering) => (
            <Card
              key={offering.id}
              className="p-6 hover-elevate"
              data-testid={`offering-card-${offering.id}`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{offering.name}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={getTypeColor(offering.type)}>
                        {getTypeLabel(offering.type)}
                      </Badge>
                      {!offering.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {offering.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {offering.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">${offering.price}</span>
                  </div>
                  {offering.durationMinutes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{offering.durationMinutes} minutes</span>
                    </div>
                  )}
                </div>
                
                {offering.assignedStaff && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Assigned to:</div>
                    <div className="text-sm font-medium">
                      {offering.assignedStaff.firstName} {offering.assignedStaff.lastName}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(offering)}
                    data-testid={`button-edit-${offering.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(offering.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${offering.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
