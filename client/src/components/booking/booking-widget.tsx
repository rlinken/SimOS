import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  DollarSign,
  Info,
  Star,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay, startOfDay, addMinutes, parse } from "date-fns";

/**
 * Public Booking Widget
 *
 * A beautiful, conversion-optimized booking experience for golf simulator facilities.
 *
 * Features:
 * - Clean calendar-based availability display
 * - Real-time bay availability
 * - Minimal friction checkout (name, email, phone, payment)
 * - Auto-account creation
 * - Multiple payment options (online, at entry, deposit, recurring)
 * - Mobile responsive
 * - Fully brandable
 * - Embeddable on any website
 */

export interface BookingWidgetConfig {
  facilityId: number;
  facilityName: string;
  logo?: string;
  primaryColor?: string;
  accentColor?: string;
  showPricing?: boolean;
  requirePhone?: boolean;
  allowGuestCheckout?: boolean;
  depositAmount?: number;
  depositType?: "fixed" | "percentage";
}

export interface Bay {
  id: number;
  name: string;
  description?: string;
  tier: "standard" | "premium" | "vip";
  pricePerHour: number;
  features?: string[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  bayId?: number;
  price?: number;
}

export interface BookingData {
  bayId: number;
  date: Date;
  startTime: string;
  duration: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: "online" | "at_entry" | "deposit" | "membership";
  specialRequests?: string;
}

const defaultConfig: BookingWidgetConfig = {
  facilityId: 1,
  facilityName: "Golf Simulator",
  primaryColor: "#4CAF50",
  accentColor: "#FF9800",
  showPricing: true,
  requirePhone: true,
  allowGuestCheckout: true,
  depositAmount: 25,
  depositType: "fixed",
};

export function BookingWidget({ config = defaultConfig }: { config?: Partial<BookingWidgetConfig> }) {
  const widgetConfig = { ...defaultConfig, ...config };
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Date, 2: Time, 3: Bay, 4: Checkout
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [duration, setDuration] = useState<number>(1); // hours
  const [loading, setLoading] = useState(false);

  // Form data
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "at_entry" | "deposit">("online");
  const [specialRequests, setSpecialRequests] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Mock data - in production, fetch from API
  const bays: Bay[] = [
    {
      id: 1,
      name: "Bay 1 - Standard",
      description: "Perfect for practice and casual play",
      tier: "standard",
      pricePerHour: 45,
      features: ["HD Projector", "Premium Mats", "Club Storage"],
    },
    {
      id: 2,
      name: "Bay 2 - Premium",
      description: "Enhanced experience with TrackMan",
      tier: "premium",
      pricePerHour: 65,
      features: ["TrackMan Launch Monitor", "4K Projector", "Premium Seating", "Beverage Service"],
    },
    {
      id: 3,
      name: "Bay 3 - VIP",
      description: "Ultimate golf simulator experience",
      tier: "vip",
      pricePerHour: 95,
      features: [
        "TrackMan 4 Launch Monitor",
        "4K 200\" Screen",
        "Private Lounge",
        "Full Bar Service",
        "Club Fitting Available",
      ],
    },
  ];

  const timeSlots: TimeSlot[] = generateTimeSlots(selectedDate);

  const calculateTotal = () => {
    if (!selectedBay) return 0;
    const subtotal = selectedBay.pricePerHour * duration;
    if (paymentMethod === "deposit" && widgetConfig.depositAmount) {
      return widgetConfig.depositType === "percentage"
        ? subtotal * (widgetConfig.depositAmount / 100)
        : widgetConfig.depositAmount;
    }
    return subtotal;
  };

  const handleBooking = async () => {
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const bookingData: BookingData = {
      bayId: selectedBay!.id,
      date: selectedDate,
      startTime: selectedTime,
      duration,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      specialRequests,
    };

    console.log("Booking created:", bookingData);

    // Show confirmation
    setStep(4);
    setLoading(false);
  };

  const canProceedToCheckout = () => {
    return selectedDate && selectedTime && selectedBay && duration > 0;
  };

  return (
    <div
      className="booking-widget w-full max-w-6xl mx-auto"
      style={{ "--primary-color": widgetConfig.primaryColor } as React.CSSProperties}
    >
      {/* Header */}
      <Card className="mb-6 p-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {widgetConfig.logo && (
              <img src={widgetConfig.logo} alt="Logo" className="h-12 w-12 rounded-lg" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{widgetConfig.facilityName}</h1>
              <p className="text-muted-foreground">Book your perfect simulator session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">Secure Booking</span>
          </div>
        </div>
      </Card>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[
            { num: 1, label: "Date & Time", icon: Calendar },
            { num: 2, label: "Select Bay", icon: MapPin },
            { num: 3, label: "Checkout", icon: CreditCard },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    step >= s.num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    step >= s.num ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-all",
                    step > s.num ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Date & Time Selection */}
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Date
            </h3>
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </Card>

          {/* Time Slots */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Available Times
              </h3>
              <span className="text-sm text-muted-foreground">
                {format(selectedDate, "MMM d, yyyy")}
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    slot.available
                      ? selectedTime === slot.time
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                      : "border-border opacity-50 cursor-not-allowed bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{slot.time}</span>
                    {slot.available ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500">
                        Booked
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Duration Selector */}
            <div className="mt-6 pt-6 border-t">
              <Label className="mb-3 block">Duration</Label>
              <RadioGroup value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                {[1, 1.5, 2, 3, 4].map((hours) => (
                  <div key={hours} className="flex items-center space-x-2">
                    <RadioGroupItem value={hours.toString()} id={`duration-${hours}`} />
                    <Label htmlFor={`duration-${hours}`} className="cursor-pointer">
                      {hours} {hours === 1 ? "hour" : "hours"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button
              className="w-full mt-6"
              size="lg"
              onClick={() => setStep(2)}
              disabled={!selectedDate || !selectedTime || !duration}
            >
              Continue to Bay Selection
            </Button>
          </Card>
        </div>
      )}

      {/* Step 2: Bay Selection */}
      {step === 2 && (
        <div>
          <Button variant="ghost" className="mb-4" onClick={() => setStep(1)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Date & Time
          </Button>

          <div className="grid md:grid-cols-3 gap-4">
            {bays.map((bay) => (
              <Card
                key={bay.id}
                className={cn(
                  "p-6 cursor-pointer transition-all hover:shadow-lg",
                  selectedBay?.id === bay.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setSelectedBay(bay)}
              >
                {bay.tier === "premium" && (
                  <Badge className="mb-3 bg-blue-100 text-blue-700 border-blue-200">
                    Most Popular
                  </Badge>
                )}
                {bay.tier === "vip" && (
                  <Badge className="mb-3 bg-purple-100 text-purple-700 border-purple-200">
                    <Star className="w-3 h-3 mr-1" />
                    VIP Experience
                  </Badge>
                )}

                <h3 className="font-bold text-lg mb-2">{bay.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{bay.description}</p>

                <div className="space-y-2 mb-4">
                  {bay.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      ${bay.pricePerHour}
                      <span className="text-sm font-normal text-muted-foreground">/hr</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${(bay.pricePerHour * duration).toFixed(2)} for {duration}hr
                    </p>
                  </div>
                  {selectedBay?.id === bay.id && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Button
            className="w-full max-w-md mx-auto block mt-8"
            size="lg"
            onClick={() => setStep(3)}
            disabled={!selectedBay}
          >
            Continue to Checkout
          </Button>
        </div>
      )}

      {/* Step 3: Checkout */}
      {step === 3 && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Button variant="ghost" className="mb-4" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Bay Selection
            </Button>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-6">Complete Your Booking</h3>

              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="font-medium mb-4">Your Information</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll send your confirmation here
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Method */}
                <div>
                  <h4 className="font-medium mb-4">Payment Method</h4>
                  <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <div className="space-y-3">
                      <div
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border"
                        )}
                        onClick={() => setPaymentMethod("online")}
                      >
                        <RadioGroupItem value="online" id="online" />
                        <div className="flex-1">
                          <Label htmlFor="online" className="cursor-pointer font-medium">
                            Pay Online Now
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Secure payment with credit/debit card
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Instant Confirmation
                        </Badge>
                      </div>

                      <div
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          paymentMethod === "at_entry" ? "border-primary bg-primary/5" : "border-border"
                        )}
                        onClick={() => setPaymentMethod("at_entry")}
                      >
                        <RadioGroupItem value="at_entry" id="at_entry" />
                        <div className="flex-1">
                          <Label htmlFor="at_entry" className="cursor-pointer font-medium">
                            Pay at Facility
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Pay when you arrive (no card required)
                          </p>
                        </div>
                      </div>

                      {widgetConfig.depositAmount && (
                        <div
                          className={cn(
                            "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                            paymentMethod === "deposit" ? "border-primary bg-primary/5" : "border-border"
                          )}
                          onClick={() => setPaymentMethod("deposit")}
                        >
                          <RadioGroupItem value="deposit" id="deposit" />
                          <div className="flex-1">
                            <Label htmlFor="deposit" className="cursor-pointer font-medium">
                              Pay Deposit
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              ${widgetConfig.depositAmount} deposit, pay balance at facility
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Reserves Your Spot
                          </Badge>
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                </div>

                {/* Stripe Payment Form (if online selected) */}
                {paymentMethod === "online" && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Label className="mb-3 block">Card Information</Label>
                    <div className="space-y-3">
                      <Input placeholder="Card number" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="MM / YY" />
                        <Input placeholder="CVC" />
                      </div>
                      <Input placeholder="ZIP code" />
                    </div>
                  </div>
                )}

                {/* Special Requests */}
                <div>
                  <Label htmlFor="requests">Special Requests (Optional)</Label>
                  <textarea
                    id="requests"
                    className="w-full p-3 text-sm border rounded-md resize-none"
                    rows={3}
                    placeholder="Any special requirements or requests?"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>

                {/* Terms */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <a href="#" className="text-primary hover:underline">
                      terms and conditions
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-primary hover:underline">
                      cancellation policy
                    </a>
                  </Label>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={
                    !customerName ||
                    !customerEmail ||
                    !customerPhone ||
                    !agreedToTerms ||
                    loading
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Booking - ${calculateTotal().toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Booking Summary */}
          <div>
            <Card className="p-6 sticky top-4">
              <h4 className="font-semibold mb-4">Booking Summary</h4>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bay</p>
                  <p className="font-medium">{selectedBay?.name}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{format(selectedDate, "MMMM d, yyyy")}</p>
                  <p className="font-medium">{selectedTime}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{duration} hour{duration > 1 ? "s" : ""}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal</span>
                    <span className="font-medium">
                      ${(selectedBay!.pricePerHour * duration).toFixed(2)}
                    </span>
                  </div>

                  {paymentMethod === "deposit" && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Deposit (due now)</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Balance (due at facility)</span>
                        <span>
                          ${(selectedBay!.pricePerHour * duration - calculateTotal()).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  {paymentMethod === "at_entry" && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Due at facility</span>
                      <span>${(selectedBay!.pricePerHour * duration).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total {paymentMethod !== "at_entry" && "Due Now"}</span>
                  <span>${paymentMethod === "at_entry" ? "0.00" : calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Free cancellation up to 24 hours before your booking
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground mb-6">
            We've sent a confirmation email to {customerEmail}
          </p>

          <Card className="p-6 bg-muted/50 mb-6 text-left max-w-md mx-auto">
            <h3 className="font-semibold mb-4">Your Booking Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bay</span>
                <span className="font-medium">{selectedBay?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="font-medium">{format(selectedDate, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Time</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{duration} hour{duration > 1 ? "s" : ""}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.print()}>
              Print Confirmation
            </Button>
            <Button onClick={() => {
              setStep(1);
              setSelectedDate(new Date());
              setSelectedTime("");
              setSelectedBay(null);
              setCustomerName("");
              setCustomerEmail("");
              setCustomerPhone("");
            }}>
              Book Another Session
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Questions? Contact us at <a href="tel:555-123-4567" className="text-primary">555-123-4567</a>
          </p>
        </Card>
      )}
    </div>
  );
}

// Mini Calendar Component
function MiniCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = startOfDay(new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} />;
          }

          const isPast = day < today;
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isPast && onSelectDate(day)}
              disabled={isPast}
              className={cn(
                "aspect-square p-2 rounded-md text-sm font-medium transition-all",
                isPast && "opacity-30 cursor-not-allowed",
                !isPast && !isSelected && "hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground",
                isToday && !isSelected && "ring-2 ring-primary/50"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Generate time slots (helper function)
function generateTimeSlots(date: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const isToday = isSameDay(date, now);

  // Generate slots from 8 AM to 10 PM
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour % 12 || 12}:${minute.toString().padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;

      // Check if slot is in the past
      const slotTime = new Date(date);
      slotTime.setHours(hour, minute, 0, 0);
      const isPast = isToday && slotTime < now;

      // Randomly mark some as unavailable (in production, check actual availability)
      const available = !isPast && Math.random() > 0.3;

      slots.push({
        time: timeString,
        available,
        bayId: available ? Math.floor(Math.random() * 3) + 1 : undefined,
      });
    }
  }

  return slots;
}
