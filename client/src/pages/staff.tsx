import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  FormDescription,
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, CheckCircle2, DollarSign, Plus, Users, Edit, Trash2, Mail, Phone } from "lucide-react";
import type { User } from "@shared/schema";
import { upsertUserSchema } from "@shared/schema";

const staffFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  role: z.enum(["administrator", "instructor", "club_fitter", "support"]),
  paymentType: z.enum(["hourly", "commission", "salary", "tips"]),
  hourlyRate: z.string().optional(),
  salary: z.string().optional(),
  commissionRate: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

export default function StaffPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("directory");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);

  const isAdmin = user?.role === "owner" || user?.role === "administrator" || user?.role === "super_admin";

  // Fetch staff members
  const { data: staffMembers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/staff"],
    enabled: !!user,
  });

  // Staff form
  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "instructor",
      paymentType: "hourly",
      hourlyRate: "",
      salary: "",
      commissionRate: "",
      bio: "",
      specialties: "",
    },
  });

  const paymentType = staffForm.watch("paymentType");

  // Create/Update staff mutation
  const staffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const payload = {
        ...data,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : undefined,
        specialties: data.specialties ? data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };

      if (editingStaff) {
        return apiRequest("PATCH", `/api/staff/${editingStaff.id}`, payload);
      } else {
        return apiRequest("POST", "/api/staff", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setStaffDialogOpen(false);
      setEditingStaff(null);
      staffForm.reset();
      toast({
        title: editingStaff ? "Staff member updated" : "Staff member added",
        description: editingStaff 
          ? "Staff member has been updated successfully."
          : "New staff member has been added successfully.",
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

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest("DELETE", `/api/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Staff member removed",
        description: "Staff member has been removed successfully.",
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

  const handleAddStaff = () => {
    setEditingStaff(null);
    staffForm.reset({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "instructor",
      paymentType: "hourly",
      hourlyRate: "",
      salary: "",
      commissionRate: "",
      bio: "",
      specialties: "",
    });
    setStaffDialogOpen(true);
  };

  const handleEditStaff = (staff: User) => {
    setEditingStaff(staff);
    staffForm.reset({
      email: staff.email || "",
      firstName: staff.firstName || "",
      lastName: staff.lastName || "",
      phone: staff.phone || "",
      role: staff.role as any,
      paymentType: staff.paymentType || "hourly",
      hourlyRate: staff.hourlyRate || "",
      salary: staff.salary || "",
      commissionRate: staff.commissionRate || "",
      bio: staff.bio || "",
      specialties: staff.specialties?.join(", ") || "",
    });
    setStaffDialogOpen(true);
  };

  const handleDeleteStaff = (staffId: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      deleteMutation.mutate(staffId);
    }
  };

  const onSubmitStaff = (data: StaffFormData) => {
    staffMutation.mutate(data);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "administrator":
        return "secondary";
      case "instructor":
        return "outline";
      case "club_fitter":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "administrator":
        return "Administrator";
      case "instructor":
        return "Instructor";
      case "club_fitter":
        return "Club Fitter";
      case "support":
        return "Support";
      case "owner":
        return "Owner";
      default:
        return role;
    }
  };

  const getPaymentLabel = (staff: User) => {
    switch (staff.paymentType) {
      case "hourly":
        return staff.hourlyRate ? `$${staff.hourlyRate}/hr` : "Hourly";
      case "salary":
        return staff.salary ? `$${parseFloat(staff.salary).toLocaleString()}/yr` : "Salary";
      case "commission":
        return staff.commissionRate ? `${staff.commissionRate}% commission` : "Commission";
      case "tips":
        return "Tips";
      default:
        return "Not set";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please log in to view staff management.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl space-y-8" data-testid="page-staff">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold mb-2" data-testid="text-page-title">
            Staff Management
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage your team, track hours, assign tasks, and monitor payroll
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddStaff} data-testid="button-add-staff">
            <Plus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-staff">
          <TabsTrigger value="directory" data-testid="tab-directory">
            <Users className="mr-2 h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours">
            <Clock className="mr-2 h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">
            <DollarSign className="mr-2 h-4 w-4" />
            Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading staff members...</p>
            </div>
          ) : staffMembers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No staff members yet</p>
                <p className="text-muted-foreground mb-4">Get started by adding your first staff member</p>
                {isAdmin && (
                  <Button onClick={handleAddStaff} data-testid="button-add-first-staff">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff Member
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staffMembers.map((staff) => (
                <Card key={staff.id} className="hover-elevate" data-testid={`card-staff-${staff.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={staff.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {staff.firstName?.[0]}{staff.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg" data-testid={`text-staff-name-${staff.id}`}>
                            {staff.firstName} {staff.lastName}
                          </CardTitle>
                          <Badge variant={getRoleBadgeVariant(staff.role || "")} className="mt-1" data-testid={`badge-role-${staff.id}`}>
                            {getRoleLabel(staff.role || "")}
                          </Badge>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditStaff(staff)}
                            data-testid={`button-edit-staff-${staff.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteStaff(staff.id)}
                            data-testid={`button-delete-staff-${staff.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {staff.email && (
                      <div className="flex items-center gap-2 text-sm" data-testid={`text-email-${staff.id}`}>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{staff.email}</span>
                      </div>
                    )}
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-sm" data-testid={`text-phone-${staff.id}`}>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{staff.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm" data-testid={`text-payment-${staff.id}`}>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{getPaymentLabel(staff)}</span>
                    </div>
                    {staff.specialties && staff.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {staff.specialties.map((specialty, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-specialty-${staff.id}-${idx}`}>
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {staff.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2" data-testid={`text-bio-${staff.id}`}>
                        {staff.bio}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hours Tracking - Coming Soon</CardTitle>
              <CardDescription>Clock in/out and view timesheet data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Hours tracking features coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Management - Coming Soon</CardTitle>
              <CardDescription>Create and assign tasks to team members</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Task management features coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll - Coming Soon</CardTitle>
              <CardDescription>Track commissions, tips, and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Payroll features coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-staff">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff 
                ? "Update staff member information and payment details."
                : "Add a new staff member to your team."}
            </DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onSubmitStaff)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={staffForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={staffForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={staffForm.control}
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
                <FormField
                  control={staffForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={staffForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="club_fitter">Club Fitter</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Payment Structure</h3>
                
                <FormField
                  control={staffForm.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-type">
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly Rate</SelectItem>
                          <SelectItem value="salary">Annual Salary</SelectItem>
                          <SelectItem value="commission">Commission</SelectItem>
                          <SelectItem value="tips">Tips</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {paymentType === "hourly" && (
                  <FormField
                    control={staffForm.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="25.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-hourly-rate"
                          />
                        </FormControl>
                        <FormDescription>Enter the hourly rate in dollars</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {paymentType === "salary" && (
                  <FormField
                    control={staffForm.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Annual Salary ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="50000.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-salary"
                          />
                        </FormControl>
                        <FormDescription>Enter the annual salary in dollars</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {paymentType === "commission" && (
                  <FormField
                    control={staffForm.control}
                    name="commissionRate"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Commission Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="15.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-commission-rate"
                          />
                        </FormControl>
                        <FormDescription>Enter the commission percentage (e.g., 15 for 15%)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={staffForm.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialties</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Swing Analysis, Club Fitting, Beginner Lessons"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-specialties"
                      />
                    </FormControl>
                    <FormDescription>Enter specialties separated by commas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={staffForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief biography or description"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-bio"
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
                  onClick={() => setStaffDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={staffMutation.isPending}
                  data-testid="button-save-staff"
                >
                  {staffMutation.isPending ? "Saving..." : editingStaff ? "Update Staff" : "Add Staff"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
