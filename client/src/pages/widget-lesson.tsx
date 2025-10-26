import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  GraduationCap,
  Check,
  Phone,
} from "lucide-react";
import { format, addDays } from "date-fns";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface WidgetConfig {
  displayMode?: string;
  showLogo?: boolean;
  showDescription?: boolean;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  customTitle?: string;
  customDescription?: string;
  showPricing?: boolean;
  requirePhone?: boolean;
}

// Convert 24-hour time to 12-hour format with AM/PM
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function WidgetLesson() {
  const { facilityId, lessonOfferId } = useParams();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Get query params for display mode
  const searchParams = new URLSearchParams(window.location.search);
  const displayMode = searchParams.get("mode") || "full";

  const { data: facility, isLoading: facilityLoading, error: facilityError } = useQuery({
    queryKey: [`/api/facilities/${facilityId}`],
    enabled: !!facilityId,
  });

  const { data: lessonOffer, isLoading: lessonOfferLoading } = useQuery({
    queryKey: [`/api/lesson-offers/${lessonOfferId}`],
    enabled: !!lessonOfferId,
  });

  const { data: instructor, isLoading: instructorLoading } = useQuery({
    queryKey: [`/api/users/${lessonOffer?.instructorId}`],
    enabled: !!lessonOffer?.instructorId,
  });

  const { data: widgetConfig, isLoading: configLoading } = useQuery<WidgetConfig>({
    queryKey: [`/api/widget-config/${facilityId}/lesson`],
    enabled: !!facilityId,
  });

  const { data: availability, isLoading: availabilityLoading, error: availabilityError } = useQuery<TimeSlot[]>({
    queryKey: [
      `/api/widget/lesson-availability/${facilityId}/${lessonOfferId}`,
      selectedDate.toISOString(),
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/widget/lesson-availability/${facilityId}/${lessonOfferId}?date=${selectedDate.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
    enabled: !!facilityId && !!lessonOfferId,
  });

  const isLoading = facilityLoading || lessonOfferLoading || instructorLoading || configLoading || availabilityLoading;

  const createLessonBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/widget/lesson-bookings/${facilityId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Lesson booked!",
        description: "You'll receive a confirmation email shortly.",
      });
      setShowBookingForm(false);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setSelectedTime(null);
      queryClient.invalidateQueries({
        queryKey: [`/api/widget/lesson-availability/${facilityId}/${lessonOfferId}`],
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
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (widgetConfig?.requirePhone && !customerPhone) {
      toast({
        title: "Phone number required",
        description: "Please provide your phone number",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const bookingDateTime = new Date(selectedDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    createLessonBookingMutation.mutate({
      lessonOfferId,
      startTime: bookingDateTime.toISOString(),
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
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

  // Styling from widget config or facility
  const primaryColor =
    widgetConfig?.primaryColor || facility?.primaryColor || "#a855f7";
  const accentColor =
    widgetConfig?.accentColor || facility?.accentColor || "#c084fc";
  const backgroundColor = widgetConfig?.backgroundColor || "#ffffff";
  const textColor = widgetConfig?.textColor || "#000000";

  const containerClass =
    displayMode === "sidebar"
      ? "max-w-md"
      : displayMode === "partial"
        ? "max-w-3xl"
        : "max-w-6xl";

  if (facilityError || availabilityError) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Unable to Load Widget</h2>
          <p className="text-muted-foreground">
            {availabilityError
              ? "Unable to load lesson availability. Please try again."
              : "Please check the widget URL and try again."}
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lesson widget...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ backgroundColor, color: textColor }}
    >
      <style>
        {`
          .widget-lesson-btn-primary {
            background-color: ${primaryColor};
            color: white;
          }
          .widget-lesson-btn-primary:hover {
            opacity: 0.9;
          }
        `}
      </style>

      <div className={`mx-auto ${containerClass}`}>
        {/* Header */}
        {widgetConfig?.showLogo !== false && facility && (
          <div className="text-center mb-8">
            {facility.logo && (
              <img
                src={facility.logo}
                alt={facility.name}
                className="h-16 mx-auto mb-4"
                data-testid="img-facility-logo"
              />
            )}
            <h1
              className="text-3xl md:text-4xl font-bold mb-2"
              data-testid="text-lesson-title"
            >
              {widgetConfig?.customTitle || "Book a Golf Lesson"}
            </h1>
            {widgetConfig?.showDescription !== false && (
              <p className="text-lg opacity-80 mb-4">
                {widgetConfig?.customDescription ||
                  "Learn from professional instructors"}
              </p>
            )}
            {lessonOffer && instructor && (
              <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-md">
                <GraduationCap className="w-5 h-5" style={{ color: primaryColor }} />
                <div className="text-left">
                  <p className="font-semibold text-sm">{lessonOffer.name}</p>
                  <p className="text-xs opacity-70">
                    with {instructor.firstName} {instructor.lastName}
                  </p>
                </div>
                {widgetConfig?.showPricing !== false && (
                  <p className="font-bold ml-2" style={{ color: primaryColor }}>
                    ${lessonOffer.price}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Date Selection */}
          <Card className="p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" style={{ color: primaryColor }} />
              Select Date
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                const date = addDays(new Date(), offset);
                const isSelected =
                  format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedDate(date);
                    }}
                    className={`flex flex-col items-center justify-center h-20 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "widget-lesson-btn-primary border-transparent shadow-md"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    data-testid={`button-date-${offset}`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {format(date, "EEE")}
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        isSelected ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {format(date, "d")}
                    </span>
                    <span
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {format(date, "MMM")}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Time Selection */}
          <Card className="p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: primaryColor }} />
              Select Time
            </h2>
            <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2">
              {generateTimeSlots().map((time) => {
                const available = getAvailabilityForTime(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!available}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedTime(time);
                      setShowBookingForm(true);
                    }}
                    className={`h-12 rounded-lg font-medium transition-all ${
                      isSelected
                        ? "widget-lesson-btn-primary shadow-md"
                        : available
                          ? "border-2 border-gray-200 hover:border-gray-300 bg-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                    data-testid={`button-time-${time.replace(":", "-")}`}
                  >
                    {formatTime12Hour(time)}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Booking Form */}
        {showBookingForm && selectedTime && (
          <Card className="p-6 md:p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <User className="w-6 h-6" style={{ color: primaryColor }} />
              Your Information
            </h2>

            {/* Booking Summary */}
            <div
              className="p-4 rounded-lg mb-6"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" style={{ color: primaryColor }} />
                Lesson Summary
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">Lesson:</span>
                  <span className="font-medium">{lessonOffer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Instructor:</span>
                  <span className="font-medium">
                    {instructor?.firstName} {instructor?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Date:</span>
                  <span className="font-medium">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Time:</span>
                  <span className="font-medium">{formatTime12Hour(selectedTime)}</span>
                </div>
                {widgetConfig?.showPricing !== false && (
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold" style={{ color: primaryColor }}>
                      ${lessonOffer?.price}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-base">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1.5 h-11"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-base">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1.5 h-11"
                    data-testid="input-customer-email"
                  />
                </div>
              </div>

              {(widgetConfig?.requirePhone || true) && (
                <div>
                  <Label htmlFor="phone" className="text-base">
                    Phone Number {widgetConfig?.requirePhone && "*"}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1.5 h-11"
                    data-testid="input-customer-phone"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleBooking}
                  disabled={createLessonBookingMutation.isPending}
                  className="widget-lesson-btn-primary flex-1 h-12 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity"
                  data-testid="button-confirm-lesson-booking"
                >
                  {createLessonBookingMutation.isPending ? (
                    "Processing..."
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Book Lesson
                    </>
                  )}
                </button>
                <Button
                  variant="outline"
                  onClick={() => setShowBookingForm(false)}
                  className="flex-1 h-12"
                  data-testid="button-cancel-lesson-booking"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Facility Info Footer */}
        {facility && (
          <div className="mt-8 text-center text-sm opacity-60">
            <p>{facility.name}</p>
            {facility.phone && <p>{facility.phone}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
