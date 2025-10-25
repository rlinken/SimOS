import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Clock, CheckCircle2, DollarSign, Plus, Play, Pause, Trash2, Edit } from "lucide-react";
import { format, formatDistance } from "date-fns";
import type { User, TimeEntry, Task, Commission, Tip } from "@shared/schema";
import { insertTimeEntrySchema, insertTaskSchema, insertCommissionSchema, insertTipSchema } from "@shared/schema";

const manualTimeEntrySchema = insertTimeEntrySchema.extend({
  clockInTime: z.string(),
  clockOutTime: z.string(),
});

const taskFormSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
});

const commissionFormSchema = insertCommissionSchema.extend({
  earnedDate: z.string(),
});

const tipFormSchema = insertTipSchema.extend({
  date: z.string(),
});

export default function StaffPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hours");
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [tipDialogOpen, setTipDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isAdmin = user?.role === "owner" || user?.role === "administrator" || user?.role === "super_admin";

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/staff"],
    enabled: isAdmin,
  });

  // Fetch time entries
  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery<(TimeEntry & { staff?: User })[]>({
    queryKey: ["/api/time-entries"],
  });

  // Fetch active time entry for current user
  const { data: activeTimeEntry } = useQuery<TimeEntry>({
    queryKey: ["/api/time-entries/active"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<(Task & { assignedTo?: User; createdBy?: User })[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch commissions
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<(Commission & { staff?: User })[]>({
    queryKey: ["/api/commissions"],
    enabled: isAdmin,
  });

  // Fetch tips
  const { data: tips = [], isLoading: tipsLoading } = useQuery<(Tip & { staff?: User })[]>({
    queryKey: ["/api/tips"],
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/time-entries/clock-in", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/active"] });
      toast({ title: "Clocked in successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clock in", description: error.message, variant: "destructive" });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/time-entries/clock-out", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/active"] });
      toast({ title: "Clocked out successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clock out", description: error.message, variant: "destructive" });
    },
  });

  // Manual time entry form
  const timeForm = useForm<z.infer<typeof manualTimeEntrySchema>>({
    resolver: zodResolver(manualTimeEntrySchema),
    defaultValues: {
      staffId: "",
      clockInTime: "",
      clockOutTime: "",
      notes: "",
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof manualTimeEntrySchema>) => {
      return await apiRequest("POST", "/api/time-entries", {
        staffId: data.staffId,
        clockInTime: new Date(data.clockInTime).toISOString(),
        clockOutTime: new Date(data.clockOutTime).toISOString(),
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setTimeDialogOpen(false);
      timeForm.reset();
      toast({ title: "Time entry created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create time entry", description: error.message, variant: "destructive" });
    },
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/time-entries/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Time entry deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete time entry", description: error.message, variant: "destructive" });
    },
  });

  // Task form
  const taskForm = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
      recurrence: "none",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskFormSchema>) => {
      return await apiRequest("POST", "/api/tasks", {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      setEditingTask(null);
      taskForm.reset();
      toast({ title: "Task created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof taskFormSchema>> }) => {
      return await apiRequest("PATCH", `/api/tasks/${id}`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      setEditingTask(null);
      taskForm.reset();
      toast({ title: "Task updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  // Commission form
  const commissionForm = useForm<z.infer<typeof commissionFormSchema>>({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: {
      staffId: "",
      amount: "",
      source: "",
      earnedDate: "",
      description: "",
    },
  });

  const createCommissionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof commissionFormSchema>) => {
      return await apiRequest("POST", "/api/commissions", {
        ...data,
        earnedDate: new Date(data.earnedDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      setCommissionDialogOpen(false);
      commissionForm.reset();
      toast({ title: "Commission created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create commission", description: error.message, variant: "destructive" });
    },
  });

  const markCommissionPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/commissions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      toast({ title: "Commission marked as paid" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark commission as paid", description: error.message, variant: "destructive" });
    },
  });

  // Tip form
  const tipForm = useForm<z.infer<typeof tipFormSchema>>({
    resolver: zodResolver(tipFormSchema),
    defaultValues: {
      staffId: user?.id || "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      source: "",
    },
  });

  const createTipMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tipFormSchema>) => {
      return await apiRequest("POST", "/api/tips", {
        ...data,
        date: new Date(data.date).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tips"] });
      setTipDialogOpen(false);
      tipForm.reset();
      toast({ title: "Tip recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record tip", description: error.message, variant: "destructive" });
    },
  });

  const deleteTipMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tips/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tips"] });
      toast({ title: "Tip deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete tip", description: error.message, variant: "destructive" });
    },
  });

  // Calculate totals for payroll
  const totalCommissions = commissions
    .filter(c => !c.paidOutAt)
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const totalTips = tips.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalHours = timeEntries
    .filter(e => e.clockOutTime)
    .reduce((sum, e) => sum + parseFloat(e.totalHours || "0"), 0);

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    taskForm.reset({
      title: task.title,
      description: task.description || "",
      assignedToId: task.assignedToId || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      recurrence: task.recurrence,
    });
    setTaskDialogOpen(true);
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: { status: newStatus },
    });
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
            Track hours, manage tasks, and monitor payroll
          </p>
        </div>
        
        {/* Quick Clock In/Out */}
        {!isAdmin && (
          <div className="flex items-center gap-4">
            {activeTimeEntry ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Currently clocked in</p>
                  <p className="text-lg font-semibold" data-testid="text-active-duration">
                    {formatDistance(new Date(activeTimeEntry.clockInTime), new Date(), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  size="lg"
                  data-testid="button-clock-out"
                >
                  <Pause className="mr-2 h-5 w-5" />
                  Clock Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
                size="lg"
                data-testid="button-clock-in"
              >
                <Play className="mr-2 h-5 w-5" />
                Clock In
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-staff">
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

        {/* Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Hours (This Period)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold" data-testid="text-total-hours">
                    {totalHours.toFixed(2)} hrs
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {timeEntries
                      .filter(e => {
                        const entryDate = new Date(e.clockInTime);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return entryDate >= weekAgo && e.clockOutTime;
                      })
                      .reduce((sum, e) => sum + parseFloat(e.totalHours || "0"), 0)
                      .toFixed(2)} hrs
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {timeEntries.filter(e => !e.clockOutTime).length}
                  </p>
                </CardContent>
              </Card>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setTimeDialogOpen(true)}
                className="ml-4"
                data-testid="button-add-manual-time"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Manual Entry
              </Button>
            )}
          </div>

          {/* Time Entries List */}
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>Recent clock in/out records</CardDescription>
            </CardHeader>
            <CardContent>
              {timeEntriesLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : timeEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-time-entries">
                  No time entries yet
                </p>
              ) : (
                <div className="space-y-4">
                  {timeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`time-entry-${entry.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium" data-testid={`text-staff-name-${entry.id}`}>
                            {entry.staff?.firstName} {entry.staff?.lastName}
                          </p>
                          {!entry.clockOutTime && (
                            <Badge variant="default" data-testid={`badge-active-${entry.id}`}>
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span data-testid={`text-clock-in-${entry.id}`}>
                            In: {format(new Date(entry.clockInTime), "MMM d, h:mm a")}
                          </span>
                          {entry.clockOutTime && (
                            <>
                              <span data-testid={`text-clock-out-${entry.id}`}>
                                Out: {format(new Date(entry.clockOutTime), "MMM d, h:mm a")}
                              </span>
                              <span className="font-medium" data-testid={`text-hours-${entry.id}`}>
                                {parseFloat(entry.totalHours || "0").toFixed(2)} hrs
                              </span>
                            </>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                      {isAdmin && entry.clockOutTime && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTimeEntryMutation.mutate(entry.id)}
                          data-testid={`button-delete-time-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {tasks.filter(t => t.status === "pending").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {tasks.filter(t => t.status === "in_progress").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {tasks.filter(t => t.status === "completed").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    My Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {tasks.filter(t => t.assignedToId === user.id && t.status !== "completed").length}
                  </p>
                </CardContent>
              </Card>
            </div>
            {isAdmin && (
              <Button
                onClick={() => {
                  setEditingTask(null);
                  taskForm.reset();
                  setTaskDialogOpen(true);
                }}
                className="ml-4"
                data-testid="button-create-task"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            )}
          </div>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>Manage team tasks and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : tasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-tasks">
                  No tasks yet
                </p>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`task-${task.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </h3>
                          <Badge
                            variant={
                              task.priority === "urgent"
                                ? "destructive"
                                : task.priority === "high"
                                ? "default"
                                : "secondary"
                            }
                            data-testid={`badge-priority-${task.id}`}
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant={task.status === "completed" ? "default" : "outline"}
                            data-testid={`badge-status-${task.id}`}
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {task.assignedTo && (
                            <span data-testid={`text-assigned-to-${task.id}`}>
                              Assigned to: {task.assignedTo.firstName} {task.assignedTo.lastName}
                            </span>
                          )}
                          {task.dueDate && (
                            <span data-testid={`text-due-date-${task.id}`}>
                              Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          {task.recurrence !== "none" && (
                            <Badge variant="outline">{task.recurrence}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTaskStatusChange(task.id, "completed")}
                            data-testid={`button-complete-task-${task.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTaskEdit(task)}
                              data-testid={`button-edit-task-${task.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTaskMutation.mutate(task.id)}
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unpaid Commissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="text-total-commissions">
                  ${totalCommissions.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" data-testid="text-total-tips">
                  ${totalTips.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {totalHours.toFixed(2)} hrs
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commissions */}
            {isAdmin && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
                  <div>
                    <CardTitle>Commissions</CardTitle>
                    <CardDescription>Track sales commissions</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCommissionDialogOpen(true)}
                    data-testid="button-add-commission"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent>
                  {commissionsLoading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : commissions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-no-commissions">
                      No commissions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {commissions.slice(0, 5).map((commission) => (
                        <div
                          key={commission.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`commission-${commission.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-commission-amount-${commission.id}`}>
                              ${parseFloat(commission.amount).toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {commission.staff?.firstName} {commission.staff?.lastName} - {commission.source}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(commission.earnedDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          {!commission.paidOutAt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markCommissionPaidMutation.mutate(commission.id)}
                              data-testid={`button-mark-paid-${commission.id}`}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {commission.paidOutAt && (
                            <Badge variant="secondary">Paid</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-4">
                <div>
                  <CardTitle>Tips</CardTitle>
                  <CardDescription>Record cash tips received</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    tipForm.reset({ staffId: user.id, amount: "", date: new Date().toISOString().split("T")[0], source: "" });
                    setTipDialogOpen(true);
                  }}
                  data-testid="button-add-tip"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {tipsLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : tips.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-tips">
                    No tips recorded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tips.slice(0, 5).map((tip) => (
                      <div
                        key={tip.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`tip-${tip.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-tip-amount-${tip.id}`}>
                            ${parseFloat(tip.amount).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tip.staff?.firstName} {tip.staff?.lastName}
                            {tip.source && ` - ${tip.source}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tip.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTipMutation.mutate(tip.id)}
                            data-testid={`button-delete-tip-${tip.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Manual Time Entry Dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent data-testid="dialog-manual-time">
          <DialogHeader>
            <DialogTitle>Add Manual Time Entry</DialogTitle>
            <DialogDescription>Create a time entry for a staff member</DialogDescription>
          </DialogHeader>
          <Form {...timeForm}>
            <form onSubmit={timeForm.handleSubmit((data) => createTimeEntryMutation.mutate(data))} className="space-y-4">
              <FormField
                control={timeForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.firstName} {staff.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={timeForm.control}
                name="clockInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clock In Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-clock-in" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={timeForm.control}
                name="clockOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clock Out Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-clock-out" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={timeForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-time-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createTimeEntryMutation.isPending} data-testid="button-submit-time">
                  {createTimeEntryMutation.isPending ? "Creating..." : "Create Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => {
        setTaskDialogOpen(open);
        if (!open) {
          setEditingTask(null);
          taskForm.reset();
        }
      }}>
        <DialogContent data-testid="dialog-task">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details" : "Assign a new task to a team member"}
            </DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form
              onSubmit={taskForm.handleSubmit((data) => {
                if (editingTask) {
                  updateTaskMutation.mutate({ id: editingTask.id, data });
                } else {
                  createTaskMutation.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assign-to">
                            <SelectValue placeholder="Select person" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.firstName} {staff.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={taskForm.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-recurrence">
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  data-testid="button-submit-task"
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending
                    ? "Saving..."
                    : editingTask
                    ? "Update Task"
                    : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Commission Dialog */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent data-testid="dialog-commission">
          <DialogHeader>
            <DialogTitle>Add Commission</DialogTitle>
            <DialogDescription>Record a sales commission for a staff member</DialogDescription>
          </DialogHeader>
          <Form {...commissionForm}>
            <form onSubmit={commissionForm.handleSubmit((data) => createCommissionMutation.mutate(data))} className="space-y-4">
              <FormField
                control={commissionForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-commission-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.firstName} {staff.lastName}
                          </SelectItem>
                        ))}
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
                      <Input type="number" step="0.01" {...field} data-testid="input-commission-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={commissionForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (e.g., Membership Sale, Lesson Package)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-commission-source" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={commissionForm.control}
                name="earnedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Earned Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-earned-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={commissionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-commission-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createCommissionMutation.isPending} data-testid="button-submit-commission">
                  {createCommissionMutation.isPending ? "Creating..." : "Add Commission"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={tipDialogOpen} onOpenChange={setTipDialogOpen}>
        <DialogContent data-testid="dialog-tip">
          <DialogHeader>
            <DialogTitle>Record Tip</DialogTitle>
            <DialogDescription>Log a cash tip received</DialogDescription>
          </DialogHeader>
          <Form {...tipForm}>
            <form onSubmit={tipForm.handleSubmit((data) => createTipMutation.mutate(data))} className="space-y-4">
              {isAdmin && (
                <FormField
                  control={tipForm.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tip-staff">
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.firstName} {staff.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={tipForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-tip-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tipForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-tip-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tipForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Lesson, Fitting" data-testid="input-tip-source" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createTipMutation.isPending} data-testid="button-submit-tip">
                  {createTipMutation.isPending ? "Recording..." : "Record Tip"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
