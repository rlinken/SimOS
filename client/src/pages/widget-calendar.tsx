import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { format, addDays, startOfDay, addHours, isBefore, isAfter } from "date-fns";

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function WidgetCalendar() {
  const { facilityId } = useParams();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  const { data: facility } = useQuery({
    queryKey: [`/api/facilities/${facilityId}`],
    enabled: !!facilityId,
  });

  const { data: availability } = useQuery<TimeSlot[]>({
    queryKey: [`/api/widget/availability/${facilityId}`, selectedDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/widget/availability/${facilityId}?date=${selectedDate.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
    enabled: !!facilityId,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/widget/bookings/${facilityId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Booking confirmed!",
        description: "You'll receive a confirmation email shortly.",
      });
      setShowBookingForm(false);
      setCustomerName("");
      setCustomerEmail("");
      setSelectedTime(null);
      queryClient.invalidateQueries({
        queryKey: [`/api/widget/availability/${facilityId}`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleBooking = () => {
    if (!selectedTime || !customerName || !customerEmail) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const bookingDateTime = new Date(selectedDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    createBookingMutation.mutate({
      startTime: bookingDateTime.toISOString(),
      duration: 60,
      customerName,
      customerEmail,
    });
  };

  const generateTimeSlots = (): string[] => {
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const getAvailabilityForTime = (time: string): boolean => {
    if (!availability) return true;
    const slot = availability.find((s) => s.time === time);
    return slot?.available ?? true;
  };

  const primaryColor = facility?.primaryColor || "#16a34a";
  const accentColor = facility?.accentColor || "#22c55e";

  return (
    <div className="min-h-screen bg-background p-4">
      <style>
        {`
          :root {
            --primary: ${primaryColor};
            --accent: ${accentColor};
          }
        `}
      </style>

      <div className="max-w-4xl mx-auto">
        {facility && (
          <div className="text-center mb-6">
            {facility.logo && (
              <img
                src={facility.logo}
                alt={facility.name}
                className="h-16 mx-auto mb-4"
                data-testid="img-facility-logo"
              />
            )}
            <h1 className="text-3xl font-bold" data-testid="text-facility-name">
              {facility.name}
            </h1>
            <p className="text-muted-foreground">Book Your Bay Time</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                const date = addDays(new Date(), offset);
                const isSelected =
                  format(date, "yyyy-MM-dd") ===
                  format(selectedDate, "yyyy-MM-dd");
                return (
                  <Button
                    key={offset}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setSelectedDate(date)}
                    className="flex flex-col h-auto p-3"
                    data-testid={`button-date-${offset}`}
                  >
                    <span className="text-xs">{format(date, "EEE")}</span>
                    <span className="text-lg font-bold">
                      {format(date, "d")}
                    </span>
                  </Button>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Select Time
            </h2>
            <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
              {generateTimeSlots().map((time) => {
                const available = getAvailabilityForTime(time);
                const isSelected = selectedTime === time;
                return (
                  <Button
                    key={time}
                    variant={isSelected ? "default" : "outline"}
                    disabled={!available}
                    onClick={() => {
                      setSelectedTime(time);
                      setShowBookingForm(true);
                    }}
                    className="h-12"
                    data-testid={`button-time-${time.replace(":", "-")}`}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>

        {showBookingForm && selectedTime && (
          <Card className="mt-6 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Information
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    data-testid="input-customer-email"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium">Booking Summary:</p>
                <p className="text-sm text-muted-foreground">
                  Date: {format(selectedDate, "MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Time: {selectedTime}
                </p>
                <p className="text-sm text-muted-foreground">Duration: 1 hour</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleBooking}
                  disabled={createBookingMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-booking"
                >
                  {createBookingMutation.isPending
                    ? "Confirming..."
                    : "Confirm Booking"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBookingForm(false)}
                  data-testid="button-cancel-booking"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
