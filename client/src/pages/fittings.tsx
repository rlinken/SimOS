import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { Target, Calendar, User, Check, Plus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Fitting, User as UserType, InsertFitting } from "@shared/schema";
import { insertFittingSchema } from "@shared/schema";

export default function FittingsPage() {
  const { toast } = useToast();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const { data: fittings, isLoading: fittingsLoading } = useQuery<
    (Fitting & { fitter: UserType; user: UserType })[]
  >({
    queryKey: ["/api/fittings"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const scheduleFittingMutation = useMutation({
    mutationFn: async (data: InsertFitting) => {
      return await apiRequest("/api/fittings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fittings"] });
      setIsScheduleDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Fitting scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule fitting",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertFitting>({
    resolver: zodResolver(insertFittingSchema.omit({ facilityId: true })),
    defaultValues: {
      title: "",
      date: new Date().toISOString().slice(0, 16),
      durationMinutes: 90,
      fitterId: "",
      userId: "",
      notes: "",
      completed: false,
    },
  });

  const onScheduleSubmit = (data: InsertFitting) => {
    scheduleFittingMutation.mutate(data);
  };

  const fitters = users?.filter(
    (u) => u.role === "club_fitter" || u.role === "owner" || u.role === "administrator"
  ) || [];

  const clients = users?.filter(
    (u) => u.role === "customer" || u.role === "member"
  ) || [];

  if (fittingsLoading || usersLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Club Fittings</h1>
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
            Club Fittings
          </h1>
          <p className="text-muted-foreground">
            Manage club fitting appointments
          </p>
        </div>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-schedule-fitting">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Fitting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Club Fitting</DialogTitle>
              <DialogDescription>
                Book a club fitting appointment for a customer
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onScheduleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fitting Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Full Bag Fitting"
                          data-testid="input-fitting-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fitterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club Fitter</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-fitter">
                              <SelectValue placeholder="Select fitter" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fitters.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No fitters available
                              </div>
                            ) : (
                              fitters.map((fitter) => (
                                <SelectItem key={fitter.id} value={fitter.id}>
                                  {fitter.firstName} {fitter.lastName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No clients available
                              </div>
                            ) : (
                              clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.firstName} {client.lastName}
                                  {client.email && (
                                    <span className="text-muted-foreground ml-2">
                                      ({client.email})
                                    </span>
                                  )}
                                </SelectItem>
                              ))
                            )}
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
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            data-testid="input-fitting-date"
                            {...field}
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
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="90"
                            data-testid="input-duration"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 90)}
                          />
                        </FormControl>
                        <FormDescription>
                          Default is 90 minutes
                        </FormDescription>
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements or notes..."
                          data-testid="input-fitting-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsScheduleDialogOpen(false)}
                    data-testid="button-cancel-schedule"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={scheduleFittingMutation.isPending}
                    data-testid="button-submit-schedule"
                  >
                    {scheduleFittingMutation.isPending ? "Scheduling..." : "Schedule Fitting"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fittings List */}
      {!fittings || fittings.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            No fittings scheduled
          </h3>
          <p className="text-muted-foreground mb-4">
            Schedule your first club fitting appointment
          </p>
          <Button
            onClick={() => setIsScheduleDialogOpen(true)}
            data-testid="button-schedule-first-fitting"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Fitting
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {fittings.map((fitting) => (
            <Card
              key={fitting.id}
              className="p-6 hover-elevate"
              data-testid={`card-fitting-${fitting.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{fitting.title}</h3>
                    {fitting.completed && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Check className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm flex-wrap">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="font-mono">
                        {format(new Date(fitting.date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>
                        Fitter: {fitting.fitter?.firstName}{" "}
                        {fitting.fitter?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>
                        Client: {fitting.user?.firstName}{" "}
                        {fitting.user?.lastName}
                      </span>
                    </div>
                    {fitting.durationMinutes && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{fitting.durationMinutes} minutes</span>
                      </div>
                    )}
                  </div>

                  {fitting.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        {fitting.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
