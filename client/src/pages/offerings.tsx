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
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Package, 
  Plus, 
  Clock, 
  DollarSign, 
  Check, 
  Link as LinkIcon, 
  Calendar, 
  Dumbbell, 
  Award, 
  Target,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Offering, User, TransformationPackage, InsertTransformationPackage } from "@shared/schema";
import { insertOfferingSchema, insertTransformationPackageSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const offeringFormSchema = insertOfferingSchema.omit({ facilityId: true });
type OfferingFormData = z.infer<typeof offeringFormSchema>;
type EnrichedOffering = Offering & { assignedStaff?: User };

export default function OfferingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Offers
        </h1>
        <p className="text-muted-foreground">
          Manage all your offerings including general services and transformation packages
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general-offers">
            <Package className="w-4 h-4 mr-2" />
            General Offers
          </TabsTrigger>
          <TabsTrigger value="transformation" data-testid="tab-transformation-packages">
            <Sparkles className="w-4 h-4 mr-2" />
            Transformation Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralOffersTab />
        </TabsContent>

        <TabsContent value="transformation" className="space-y-6">
          <TransformationPackagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// General Offers Tab Component
function GeneralOffersTab() {
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
      case "lesson": return "Lesson";
      case "fitting": return "Club Fitting";
      case "product": return "Product";
      case "membership": return "Membership";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lesson": return "bg-primary/10 text-primary";
      case "fitting": return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "product": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "membership": return "bg-green-500/10 text-green-600 dark:text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-muted-foreground">
          Manage lessons, fittings, products, and memberships
        </p>
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
    </>
  );
}

// Transformation Packages Tab Component  
function TransformationPackagesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery<TransformationPackage[]>({
    queryKey: ["/api/transformation-packages"],
  });

  const form = useForm<InsertTransformationPackage>({
    resolver: zodResolver(insertTransformationPackageSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
      billingFrequency: "one_time",
      durationMonths: 3,
      includeLessons: true,
      totalLessons: 12,
      lessonDurationMinutes: 60,
      lessonsPerWeek: 1,
      lessonsPerMonth: 0,
      includeClubFitting: true,
      clubFittingSessions: 1,
      includeBayAccess: true,
      bayAccessHours: 10,
      bayAccessPerWeek: 0,
      allowedBayTiers: ["standard"],
      includeOnCoursePractice: false,
      onCoursePracticeSessions: 0,
      features: [],
      isActive: true,
      maxEnrollments: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTransformationPackage) => {
      return apiRequest("POST", "/api/transformation-packages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transformation-packages"] });
      toast({
        title: "Success",
        description: "Transformation package created successfully",
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

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-muted-foreground">
          Comprehensive training packages with lessons, fittings, and bay access
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-package">
              <Plus className="w-4 h-4 mr-2" />
              Create Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Transformation Package</DialogTitle>
              <DialogDescription>
                Bundle lessons, fittings, bay access, and practice sessions into one comprehensive offering
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-6"
              >
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Basic Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Golf Transformation Program"
                              data-testid="input-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="durationMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Months)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-duration"
                            />
                          </FormControl>
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
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Complete golf improvement program including personalized instruction, equipment optimization, and unlimited practice access"
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Pricing</h3>
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
                              min="0"
                              step="0.01"
                              placeholder="1999.00"
                              data-testid="input-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-billing-frequency">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="one_time">One-Time Payment</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Lessons */}
                <div className="space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="includeLessons"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Lessons</FormLabel>
                          <FormDescription>
                            Add personalized golf instruction to this package
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-include-lessons"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("includeLessons") && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="totalLessons"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Lessons</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || 0}
                                type="number"
                                min="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-total-lessons"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lessonsPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Per Week (optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || 0}
                                type="number"
                                min="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-lessons-per-week"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              For weekly scheduling
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lessonDurationMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lesson Duration (min)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || 60}
                                type="number"
                                min="15"
                                step="15"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-lesson-duration"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Club Fitting */}
                <div className="space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="includeClubFitting"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Club Fitting</FormLabel>
                          <FormDescription>
                            Professional club fitting sessions
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-include-fitting"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("includeClubFitting") && (
                    <FormField
                      control={form.control}
                      name="clubFittingSessions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fitting Sessions</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || 1}
                              type="number"
                              min="1"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-fitting-sessions"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Bay Access */}
                <div className="space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="includeBayAccess"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Bay Access</FormLabel>
                          <FormDescription>
                            Simulator bay practice hours
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-include-bay-access"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("includeBayAccess") && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="bayAccessHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Bay Hours</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || 0}
                                type="number"
                                min="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-bay-hours"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bayAccessPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bay Hours Per Week (optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || 0}
                                type="number"
                                min="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-bay-hours-per-week"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              For recurring weekly access
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* On-Course Practice */}
                <div className="space-y-4 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="includeOnCoursePractice"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include On-Course Practice</FormLabel>
                          <FormDescription>
                            Real course practice sessions
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-include-on-course"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("includeOnCoursePractice") && (
                    <FormField
                      control={form.control}
                      name="onCoursePracticeSessions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Practice Sessions</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || 0}
                              type="number"
                              min="0"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-on-course-sessions"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Availability */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Availability</h3>
                  <FormField
                    control={form.control}
                    name="maxEnrollments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Enrollments (optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="number"
                            min="1"
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? parseInt(val) : null);
                            }}
                            placeholder="Unlimited"
                            data-testid="input-max-enrollments"
                          />
                        </FormControl>
                        <FormDescription>
                          Leave empty for unlimited enrollments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                    {createMutation.isPending ? "Creating..." : "Create Package"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packages Grid */}
      {!packages || packages.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No transformation packages yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first transformation package to offer comprehensive training programs
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-package">
            <Plus className="w-4 h-4 mr-2" />
            Create First Package
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="p-6 space-y-6 hover-elevate"
              data-testid={`card-package-${pkg.id}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pkg.durationMonths} Month{pkg.durationMonths > 1 ? "s" : ""} Program
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {pkg.billingFrequency.replace("_", " ").toUpperCase()}
                  </div>
                </div>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground">
                    {pkg.description}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold font-mono">
                  ${parseFloat(pkg.price).toFixed(2)}
                  {pkg.billingFrequency !== "one_time" && (
                    <span className="text-base font-normal text-muted-foreground">
                      /{pkg.billingFrequency}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                {pkg.includeLessons && pkg.totalLessons > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      {pkg.totalLessons} lessons ({pkg.lessonDurationMinutes} min each)
                      {pkg.lessonsPerWeek > 0 && ` • ${pkg.lessonsPerWeek}/week`}
                    </span>
                  </div>
                )}
                {pkg.includeClubFitting && (
                  <div className="flex items-center gap-2 text-sm">
                    <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      {pkg.clubFittingSessions} club fitting session{pkg.clubFittingSessions > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {pkg.includeBayAccess && pkg.bayAccessHours > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      {pkg.bayAccessHours} hours bay access
                      {pkg.bayAccessPerWeek > 0 && ` • ${pkg.bayAccessPerWeek} hrs/week`}
                    </span>
                  </div>
                )}
                {pkg.includeOnCoursePractice && pkg.onCoursePracticeSessions > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      {pkg.onCoursePracticeSessions} on-course practice session{pkg.onCoursePracticeSessions > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {pkg.maxEnrollments && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {pkg.currentEnrollments}/{pkg.maxEnrollments} spots filled
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = `${window.location.origin}/buy/transformation-package/${pkg.id}`;
                  navigator.clipboard.writeText(url);
                  toast({
                    title: "Link Copied!",
                    description: "Shareable package link copied to clipboard",
                  });
                }}
                data-testid={`button-copy-link-${pkg.id}`}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Copy Shareable Link
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
