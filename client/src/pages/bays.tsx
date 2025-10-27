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
import { TagsInput } from "@/components/ui/tags-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Plus, Activity, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Bay, InsertBay, UpdateBay } from "@shared/schema";
import { insertBaySchema, updateBaySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function BaysPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBay, setEditingBay] = useState<Bay | null>(null);
  const { toast } = useToast();

  const { data: bays, isLoading } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  const form = useForm<InsertBay>({
    resolver: zodResolver(insertBaySchema),
    defaultValues: {
      name: "",
      description: "",
      tier: "standard",
      status: "active",
      usageHours: 0,
      maintenanceNotes: "",
      tags: [],
    },
  });

  const editForm = useForm<UpdateBay>({
    resolver: zodResolver(updateBaySchema),
    defaultValues: {
      name: "",
      description: "",
      tier: "standard",
      status: "active",
      maintenanceNotes: "",
      tags: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBay) => {
      return apiRequest("POST", "/api/bays", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bays"] });
      toast({
        title: "Success",
        description: "Bay created successfully",
      });
      setIsDialogOpen(false);
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBay }) => {
      return apiRequest("PATCH", `/api/bays/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bays"] });
      toast({
        title: "Success",
        description: "Bay updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingBay(null);
      editForm.reset();
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
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/bays/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bays"] });
      toast({
        title: "Success",
        description: "Bay deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (bay: Bay) => {
    setEditingBay(bay);
    editForm.reset({
      name: bay.name,
      description: bay.description || "",
      tier: bay.tier,
      status: bay.status,
      maintenanceNotes: bay.maintenanceNotes || "",
      tags: bay.tags || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (bay: Bay) => {
    if (window.confirm(`Are you sure you want to delete ${bay.name}? This cannot be undone.`)) {
      deleteMutation.mutate(bay.id);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "vip":
        return "bg-chart-3/10 text-chart-3 border-chart-3/20";
      case "premium":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary";
      case "maintenance":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Bays</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Bays
          </h1>
          <p className="text-muted-foreground">
            Manage your facility's golf simulator bays
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-bay">
              <Plus className="w-4 h-4 mr-2" />
              Add Bay
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Bay</DialogTitle>
              <DialogDescription>
                Create a new golf simulator bay for your facility
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bay Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Bay 1"
                            data-testid="input-bay-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-tier">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Simulator details, equipment, etc."
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maintenanceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Any maintenance notes or special instructions"
                          data-testid="textarea-maintenance"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Automation Tags</FormLabel>
                      <FormControl>
                        <TagsInput
                          value={field.value || []}
                          onChange={field.onChange}
                          placeholder="Add tags for webhooks/Zapier..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Bay"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Bay Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Bay</DialogTitle>
              <DialogDescription>
                Update bay information and settings
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) => {
                  if (editingBay) {
                    updateMutation.mutate({ id: editingBay.id, data });
                  }
                })}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bay Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Bay 1"
                            data-testid="input-edit-bay-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-tier">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Simulator details, equipment, etc."
                          data-testid="input-edit-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="maintenanceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Any maintenance notes or special instructions"
                          data-testid="textarea-edit-maintenance"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Automation Tags</FormLabel>
                      <FormControl>
                        <TagsInput
                          value={field.value || []}
                          onChange={field.onChange}
                          placeholder="Add tags for webhooks/Zapier..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-edit-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-edit-submit"
                  >
                    {updateMutation.isPending ? "Updating..." : "Update Bay"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bays Grid */}
      {!bays || bays.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No bays yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first bay to start managing bookings
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-bay">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Bay
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bays.map((bay) => (
            <Card key={bay.id} className="p-6 space-y-4 hover-elevate" data-testid={`card-bay-${bay.id}`}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-semibold">{bay.name}</h3>
                  <div
                    className={`px-2 py-1 rounded-md text-xs font-medium border ${getTierColor(
                      bay.tier
                    )}`}
                  >
                    {bay.tier.toUpperCase()}
                  </div>
                </div>
                {bay.description && (
                  <p className="text-sm text-muted-foreground">
                    {bay.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 pt-2 border-t">
                <div
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${getStatusColor(
                    bay.status
                  )}`}
                >
                  <Activity className="w-3 h-3" />
                  {bay.status}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                  {bay.usageHours}h used
                </div>
              </div>

              {bay.maintenanceNotes && (
                <div className="pt-2 border-t">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {bay.maintenanceNotes}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEdit(bay)}
                  data-testid={`button-edit-${bay.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(bay)}
                  data-testid={`button-delete-${bay.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
