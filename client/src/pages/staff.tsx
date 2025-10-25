import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hours");
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [tipDialogOpen, setTipDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isAdmin = user?.role === "owner" || user?.role === "administrator" || user?.role === "super_admin";

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
    </div>
  );
}
