import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Calendar, User, Check, Plus, Package, DollarSign, Clock, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lesson, User as UserType, LessonPackage, InsertLessonPackage } from "@shared/schema";
import { insertLessonPackageSchema } from "@shared/schema";

export default function LessonsPage() {
  const { toast } = useToast();
  const [isCreatePackageOpen, setIsCreatePackageOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<LessonPackage | null>(null);

  const { data: lessons, isLoading: lessonsLoading } = useQuery<
    (Lesson & { instructor: UserType; student: UserType })[]
  >({
    queryKey: ["/api/lessons"],
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<LessonPackage[]>({
    queryKey: ["/api/lesson-packages"],
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: InsertLessonPackage) => {
      return await apiRequest("/api/lesson-packages", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-packages"] });
      setIsCreatePackageOpen(false);
      toast({
        title: "Success",
        description: "Lesson package created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lesson package",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLessonPackage> }) => {
      return await apiRequest(`/api/lesson-packages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-packages"] });
      setEditingPackage(null);
      toast({
        title: "Success",
        description: "Lesson package updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lesson package",
        variant: "destructive",
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/lesson-packages/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-packages"] });
      toast({
        title: "Success",
        description: "Lesson package deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lesson package",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertLessonPackage>({
    resolver: zodResolver(insertLessonPackageSchema.omit({ facilityId: true })),
    defaultValues: {
      name: "",
      description: "",
      packageType: "pay_per_lesson",
      priceAmount: "0",
      sessionCount: 1,
      isActive: true,
    },
  });

  const editForm = useForm<InsertLessonPackage>({
    resolver: zodResolver(insertLessonPackageSchema.omit({ facilityId: true })),
  });

  const onCreateSubmit = (data: InsertLessonPackage) => {
    createPackageMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertLessonPackage) => {
    if (!editingPackage) return;
    updatePackageMutation.mutate({ id: editingPackage.id, data });
  };

  const handleEdit = (pkg: LessonPackage) => {
    setEditingPackage(pkg);
    editForm.reset({
      name: pkg.name,
      description: pkg.description || "",
      packageType: pkg.packageType,
      priceAmount: pkg.priceAmount,
      sessionCount: pkg.sessionCount,
      validityDays: pkg.validityDays || undefined,
      billingInterval: pkg.billingInterval || undefined,
      isActive: pkg.isActive,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this lesson package?")) {
      deletePackageMutation.mutate(id);
    }
  };

  if (lessonsLoading || packagesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lessons</h1>
        </div>
        <Card className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Lessons
          </h1>
          <p className="text-muted-foreground">
            Manage golf instruction sessions and packages
          </p>
        </div>
      </div>

      <Tabs defaultValue="scheduled" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled-lessons">
            Scheduled Lessons
          </TabsTrigger>
          <TabsTrigger value="packages" data-testid="tab-lesson-packages">
            Lesson Packages
          </TabsTrigger>
        </TabsList>

        {/* Scheduled Lessons Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          {!lessons || lessons.length === 0 ? (
            <Card className="p-12 text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No lessons scheduled</h3>
              <p className="text-muted-foreground">
                Lessons will appear here once scheduled
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {lessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className="p-6 hover-elevate"
                  data-testid={`card-lesson-${lesson.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold">{lesson.title}</h3>
                        {lesson.completed && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            <Check className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span className="font-mono">
                            {format(new Date(lesson.date), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>
                            Instructor: {lesson.instructor?.firstName}{" "}
                            {lesson.instructor?.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>
                            Student: {lesson.student?.firstName}{" "}
                            {lesson.student?.lastName}
                          </span>
                        </div>
                      </div>

                      {lesson.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            {lesson.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lesson Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreatePackageOpen} onOpenChange={setIsCreatePackageOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-package">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Lesson Package</DialogTitle>
                  <DialogDescription>
                    Create a new lesson package for your facility
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Beginner's Bundle"
                              data-testid="input-package-name"
                              {...field}
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
                              placeholder="Package details..."
                              data-testid="input-package-description"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="packageType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-package-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pay_per_lesson">Pay Per Lesson</SelectItem>
                              <SelectItem value="package">Package Bundle</SelectItem>
                              <SelectItem value="recurring">Recurring Subscription</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="priceAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="99.99"
                                data-testid="input-price-amount"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sessionCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Count</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                data-testid="input-session-count"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("packageType") === "package" && (
                      <FormField
                        control={form.control}
                        name="validityDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Validity (Days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="90"
                                data-testid="input-validity-days"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormDescription>
                              How many days customers have to use all sessions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("packageType") === "recurring" && (
                      <FormField
                        control={form.control}
                        name="billingInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Interval</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-billing-interval">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatePackageOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPackageMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createPackageMutation.isPending ? "Creating..." : "Create Package"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {!packages || packages.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No lesson packages</h3>
              <p className="text-muted-foreground mb-4">
                Create lesson packages to offer bundles and subscriptions
              </p>
              <Button
                onClick={() => setIsCreatePackageOpen(true)}
                data-testid="button-create-first-package"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Package
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="p-6 hover-elevate"
                  data-testid={`card-package-${pkg.id}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{pkg.name}</h3>
                          {!pkg.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-lg">
                          ${parseFloat(pkg.priceAmount).toFixed(2)}
                        </span>
                        {pkg.packageType === "recurring" && pkg.billingInterval && (
                          <span className="text-muted-foreground">/ {pkg.billingInterval}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GraduationCap className="w-4 h-4" />
                        <span>{pkg.sessionCount} session{pkg.sessionCount > 1 ? "s" : ""}</span>
                      </div>

                      {pkg.validityDays && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Valid for {pkg.validityDays} days</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <Badge variant="outline">
                          {pkg.packageType === "pay_per_lesson" && "Pay Per Lesson"}
                          {pkg.packageType === "package" && "Package Bundle"}
                          {pkg.packageType === "recurring" && "Subscription"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pkg)}
                        data-testid={`button-edit-package-${pkg.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pkg.id)}
                        data-testid={`button-delete-package-${pkg.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Package Dialog */}
      <Dialog open={!!editingPackage} onOpenChange={(open) => !open && setEditingPackage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lesson Package</DialogTitle>
            <DialogDescription>
              Update the lesson package details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Beginner's Bundle"
                        data-testid="input-edit-package-name"
                        {...field}
                      />
                    </FormControl>
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
                      <Textarea
                        placeholder="Package details..."
                        data-testid="input-edit-package-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="packageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-package-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pay_per_lesson">Pay Per Lesson</SelectItem>
                        <SelectItem value="package">Package Bundle</SelectItem>
                        <SelectItem value="recurring">Recurring Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="priceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="99.99"
                          data-testid="input-edit-price-amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="sessionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          data-testid="input-edit-session-count"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {editForm.watch("packageType") === "package" && (
                <FormField
                  control={editForm.control}
                  name="validityDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validity (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="90"
                          data-testid="input-edit-validity-days"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many days customers have to use all sessions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {editForm.watch("packageType") === "recurring" && (
                <FormField
                  control={editForm.control}
                  name="billingInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Interval</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-billing-interval">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPackage(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePackageMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updatePackageMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
