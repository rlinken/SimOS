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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event, InsertEvent, Bay } from "@shared/schema";
import { insertEventSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TimePeriod {
  startTime: string;
  endTime: string;
}

export default function EventsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>([]);
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: bays } = useQuery<Bay[]>({
    queryKey: ["/api/bays"],
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "golf_school",
      startDate: new Date(),
      endDate: new Date(),
      bayIds: [],
      timePeriods: [],
      maxCapacity: undefined,
      instructorId: undefined,
      price: undefined,
      recurrenceType: "none",
      tags: [],
    },
  });

  const editForm = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "golf_school",
      startDate: new Date(),
      endDate: new Date(),
      bayIds: [],
      timePeriods: [],
      maxCapacity: undefined,
      instructorId: undefined,
      price: undefined,
      recurrenceType: "none",
      tags: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      return apiRequest("POST", "/api/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bay-blocks"] });
      toast({
        title: "Success",
        description: "Event created successfully. Bay blocks have been generated.",
      });
      setIsDialogOpen(false);
      form.reset();
      setTimePeriods([]);
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
    mutationFn: async ({ id, data }: { id: string; data: InsertEvent }) => {
      return apiRequest("PATCH", `/api/events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bay-blocks"] });
      toast({
        title: "Success",
        description: "Event updated successfully. Bay blocks have been regenerated.",
      });
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      editForm.reset();
      setTimePeriods([]);
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
      return apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bay-blocks"] });
      toast({
        title: "Success",
        description: "Event deleted successfully. Associated bay blocks have been removed.",
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

  const handleCreate = (data: InsertEvent) => {
    createMutation.mutate({
      ...data,
      timePeriods: timePeriods.length > 0 ? timePeriods : undefined,
    });
  };

  const handleUpdate = (data: InsertEvent) => {
    if (!editingEvent) return;
    updateMutation.mutate({
      id: editingEvent.id,
      data: {
        ...data,
        timePeriods: timePeriods.length > 0 ? timePeriods : undefined,
      },
    });
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    // Safely handle timePeriods - it comes from DB as Json type
    let periods: TimePeriod[] = [];
    if (event.timePeriods) {
      try {
        const parsed = typeof event.timePeriods === 'string' 
          ? JSON.parse(event.timePeriods) 
          : event.timePeriods;
        periods = Array.isArray(parsed) ? parsed : [];
      } catch {
        periods = [];
      }
    }
    setTimePeriods(periods);
    editForm.reset({
      name: event.name,
      description: event.description || "",
      type: event.type,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      bayIds: event.bayIds,
      timePeriods: periods,
      maxCapacity: event.maxCapacity || undefined,
      instructorId: event.instructorId || undefined,
      price: event.price || undefined,
      recurrenceType: event.recurrenceType || "none",
      tags: event.tags || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this event? All associated bay blocks will be removed.")) {
      deleteMutation.mutate(id);
    }
  };

  const addTimePeriod = () => {
    setTimePeriods([...timePeriods, { startTime: "09:00", endTime: "17:00" }]);
  };

  const removeTimePeriod = (index: number) => {
    setTimePeriods(timePeriods.filter((_, i) => i !== index));
  };

  const updateTimePeriod = (index: number, field: "startTime" | "endTime", value: string) => {
    const updated = [...timePeriods];
    updated[index][field] = value;
    setTimePeriods(updated);
  };

  const renderEventForm = (formInstance: typeof form | typeof editForm, isEdit: boolean) => (
    <Form {...formInstance}>
      <form onSubmit={formInstance.handleSubmit(isEdit ? handleUpdate : handleCreate)} className="space-y-4">
        <FormField
          control={formInstance.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Junior Golf School" data-testid="input-event-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={formInstance.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="golf_school">Golf School</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="league">League</SelectItem>
                  <SelectItem value="camp">Camp</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={formInstance.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} placeholder="Event details..." data-testid="input-event-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={formInstance.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    data-testid="input-event-start-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formInstance.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    data-testid="input-event-end-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={formInstance.control}
          name="bayIds"
          render={() => (
            <FormItem>
              <FormLabel>Assigned Bays</FormLabel>
              <FormDescription>Select which bays will be blocked for this event</FormDescription>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {bays?.map((bay) => (
                  <FormField
                    key={bay.id}
                    control={formInstance.control}
                    name="bayIds"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(bay.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              const newValue = checked
                                ? [...currentValue, bay.id]
                                : currentValue.filter((id) => id !== bay.id);
                              field.onChange(newValue);
                            }}
                            data-testid={`checkbox-bay-${bay.id}`}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{bay.name}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Time Periods (Optional)</FormLabel>
          <FormDescription>
            Leave empty to block bays all day. Add specific time periods if the event only uses bays during certain hours.
          </FormDescription>
          {timePeriods.map((period, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={period.startTime}
                onChange={(e) => updateTimePeriod(index, "startTime", e.target.value)}
                data-testid={`input-time-start-${index}`}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={period.endTime}
                onChange={(e) => updateTimePeriod(index, "endTime", e.target.value)}
                data-testid={`input-time-end-${index}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTimePeriod(index)}
                data-testid={`button-remove-period-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTimePeriod}
            data-testid="button-add-time-period"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Time Period
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={formInstance.control}
            name="maxCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Capacity (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    data-testid="input-max-capacity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formInstance.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    placeholder="0.00"
                    data-testid="input-event-price"
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
              if (isEdit) {
                setIsEditDialogOpen(false);
                setEditingEvent(null);
              } else {
                setIsDialogOpen(false);
              }
              setTimePeriods([]);
            }}
            data-testid="button-cancel-event"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isEdit ? updateMutation.isPending : createMutation.isPending}
            data-testid="button-save-event"
          >
            {isEdit ? (updateMutation.isPending ? "Updating..." : "Update Event") : (createMutation.isPending ? "Creating..." : "Create Event")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      golf_school: "Golf School",
      clinic: "Clinic",
      tournament: "Tournament",
      league: "League",
      camp: "Camp",
      other: "Other",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">Manage golf schools, clinics, and other events</p>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Manage golf schools, clinics, and other events</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-event">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {events && events.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first event to block bays for golf schools, clinics, or tournaments.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-event">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events?.map((event) => {
            const eventBays = bays?.filter((bay) => event.bayIds.includes(bay.id)) || [];
            const durationDays = Math.ceil((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            return (
              <Card key={event.id} className="p-6 hover-elevate" data-testid={`card-event-${event.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold" data-testid={`text-event-name-${event.id}`}>{event.name}</h3>
                      <Badge variant="outline" data-testid={`badge-type-${event.id}`}>
                        {getEventTypeLabel(event.type)}
                      </Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-muted-foreground mb-3" data-testid={`text-description-${event.id}`}>
                        {event.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span data-testid={`text-dates-${event.id}`}>
                          {(() => {
                            try {
                              const start = new Date(event.startDate);
                              const end = new Date(event.endDate);
                              if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                                return "Invalid dates";
                              }
                              return (
                                <>
                                  {format(start, "MMM dd, yyyy")} - {format(end, "MMM dd, yyyy")}
                                  {durationDays > 1 && <span className="ml-1">({durationDays} days)</span>}
                                </>
                              );
                            } catch {
                              return "Invalid dates";
                            }
                          })()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-bays-${event.id}`}>
                          {eventBays.length} {eventBays.length === 1 ? "bay" : "bays"}: {eventBays.map(b => b.name).join(", ") || "None"}
                        </span>
                      </div>

                      {(() => {
                        // Safely parse timePeriods from Json type
                        let periods: TimePeriod[] = [];
                        if (event.timePeriods) {
                          try {
                            const parsed = typeof event.timePeriods === 'string'
                              ? JSON.parse(event.timePeriods)
                              : event.timePeriods;
                            periods = Array.isArray(parsed) ? parsed : [];
                          } catch {
                            periods = [];
                          }
                        }
                        
                        return periods.length > 0 ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span data-testid={`text-time-periods-${event.id}`}>
                              {periods.map((p: any) => `${p.startTime}-${p.endTime}`).join(", ")}
                            </span>
                          </div>
                        ) : null;
                      })()}

                      {event.maxCapacity && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span data-testid={`text-participants-${event.id}`}>
                            {event.currentEnrollment || 0} / {event.maxCapacity} participants
                          </span>
                        </div>
                      )}

                      {event.price && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span data-testid={`text-price-${event.id}`}>
                            ${parseFloat(event.price).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(event)}
                      data-testid={`button-edit-${event.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                      data-testid={`button-delete-${event.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Create a new event and automatically block the selected bays for the event duration.
            </DialogDescription>
          </DialogHeader>
          {renderEventForm(form, false)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details. Bay blocks will be automatically regenerated.
            </DialogDescription>
          </DialogHeader>
          {renderEventForm(editForm, true)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
