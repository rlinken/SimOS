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
import { Clock, CheckCircle2, DollarSign, Plus, Users, Edit, Trash2, Mail, Phone, TrendingUp } from "lucide-react";
import type { User, CommissionStructure, InsertCommissionStructure } from "@shared/schema";
import { upsertUserSchema, insertCommissionStructureSchema } from "@shared/schema";

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
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionStructure | null>(null);

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

  // Fetch commission structures
  const { data: commissionStructures = [], isLoading: loadingCommissions } = useQuery<CommissionStructure[]>({
    queryKey: ["/api/commission-structures"],
    enabled: !!user,
  });

  // Commission form
  const commissionForm = useForm({
    resolver: zodResolver(insertCommissionStructureSchema.omit({ facilityId: true, createdAt: true, updatedAt: true })),
    defaultValues: {
      productType: "membership" as const,
      commissionType: "flat" as const,
      amount: "",
      recurringDuration: "one_time" as const,
      durationMonths: undefined,
      startDate: null,
      endDate: null,
      isActive: true,
    },
  });

  // Commission mutations
  const commissionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCommission) {
        return apiRequest("PATCH", `/api/commission-structures/${editingCommission.id}`, data);
      } else {
        return apiRequest("POST", "/api/commission-structures", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commission-structures"] });
      setCommissionDialogOpen(false);
      setEditingCommission(null);
      commissionForm.reset();
      toast({
        title: editingCommission ? "Commission updated" : "Commission created",
        description: editingCommission 
          ? "Commission structure has been updated successfully."
          : "New commission structure has been created successfully.",
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

  const deleteCommissionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/commission-structures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commission-structures"] });
      toast({
        title: "Commission deleted",
        description: "Commission structure has been deleted successfully.",
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

  const handleAddCommission = () => {
    setEditingCommission(null);
    commissionForm.reset({
      productType: "membership",
      commissionType: "flat",
      amount: "",
      recurringDuration: "one_time",
      durationMonths: undefined,
      startDate: null,
      endDate: null,
      isActive: true,
    });
    setCommissionDialogOpen(true);
  };

  const handleEditCommission = (commission: CommissionStructure) => {
    setEditingCommission(commission);
    commissionForm.reset({
      productType: commission.productType,
      commissionType: commission.commissionType,
      amount: commission.amount,
      recurringDuration: commission.recurringDuration,
      durationMonths: commission.durationMonths,
      startDate: commission.startDate,
      endDate: commission.endDate,
      isActive: commission.isActive,
    });
    setCommissionDialogOpen(true);
  };

  const handleDeleteCommission = (id: string) => {
    if (confirm("Are you sure you want to delete this commission structure?")) {
      deleteCommissionMutation.mutate(id);
    }
  };

  const onSubmitCommission = (data: any) => {
    commissionMutation.mutate(data);
  };

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
          <TabsTrigger value="commissions" data-testid="tab-commissions">
            <TrendingUp className="mr-2 h-4 w-4" />
            Commissions
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

        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Commission Structures</CardTitle>
                <CardDescription>Manage commission rules for different product types</CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={handleAddCommission} data-testid="button-add-commission">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Commission Structure
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingCommissions ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading commission structures...</p>
                </div>
              ) : commissionStructures.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No commission structures configured yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {commissionStructures.map((commission) => (
                    <Card key={commission.id} className="hover-elevate" data-testid={`card-commission-${commission.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base capitalize">
                              {commission.productType.replace('_', ' ')}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {commission.commissionType === 'flat' ? `$${commission.amount}` : `${commission.amount}%`}
                              {commission.recurringDuration !== 'one_time' && (
                                <span className="ml-1">
                                  ({commission.recurringDuration === 'forever' ? 'recurring forever' : `for ${commission.durationMonths} months`})
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <Badge variant={commission.isActive ? "default" : "secondary"} data-testid={`badge-status-${commission.id}`}>
                            {commission.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {commission.startDate && (
                          <p className="text-sm text-muted-foreground">
                            Starts: {new Date(commission.startDate).toLocaleDateString()}
                          </p>
                        )}
                        {commission.endDate && (
                          <p className="text-sm text-muted-foreground">
                            Ends: {new Date(commission.endDate).toLocaleDateString()}
                          </p>
                        )}
                        {isAdmin && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCommission(commission)}
                              data-testid={`button-edit-commission-${commission.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCommission(commission.id)}
                              data-testid={`button-delete-commission-${commission.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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

      {/* Add/Edit Commission Structure Dialog */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-commission">
          <DialogHeader>
            <DialogTitle data-testid="text-commission-dialog-title">
              {editingCommission ? "Edit Commission Structure" : "Add Commission Structure"}
            </DialogTitle>
            <DialogDescription>
              {editingCommission 
                ? "Update the commission structure for this product type."
                : "Create a new commission structure for staff referrals."}
            </DialogDescription>
          </DialogHeader>
          <Form {...commissionForm}>
            <form onSubmit={commissionForm.handleSubmit(onSubmitCommission)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={commissionForm.control}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-type">
                            <SelectValue placeholder="Select product type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="membership">Membership</SelectItem>
                          <SelectItem value="lesson_package">Lesson Package</SelectItem>
                          <SelectItem value="transformation_package">Transformation Package</SelectItem>
                          <SelectItem value="fitting">Fitting</SelectItem>
                          <SelectItem value="booking">Booking</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={commissionForm.control}
                  name="commissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-commission-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="flat">Flat Fee ($)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={commissionForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={commissionForm.watch("commissionType") === "percentage" ? "Enter percentage" : "Enter dollar amount"}
                          {...field}
                          data-testid="input-commission-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={commissionForm.control}
                  name="recurringDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurring Duration</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recurring-duration">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one_time">One Time</SelectItem>
                          <SelectItem value="x_months">For X Months</SelectItem>
                          <SelectItem value="forever">Forever</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {commissionForm.watch("recurringDuration") === "x_months" && (
                  <FormField
                    control={commissionForm.control}
                    name="durationMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Months</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter number of months"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-duration-months"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={commissionForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={commissionForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={commissionForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                        data-testid="checkbox-is-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormDescription>
                      Only active commission structures will apply to new sales
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCommissionDialogOpen(false)}
                  data-testid="button-cancel-commission"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={commissionMutation.isPending}
                  data-testid="button-submit-commission"
                >
                  {commissionMutation.isPending ? "Saving..." : editingCommission ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
