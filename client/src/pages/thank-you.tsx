import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, MapPin, Clock, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import type { Facility } from "@shared/schema";

export default function ThankYouPage() {
  const [, setLocation] = useLocation();
  const [purchaseData, setPurchaseData] = useState<any>(null);
  
  // Get facility data
  const { data: facility } = useQuery<Facility>({
    queryKey: ["/api/facility/current"],
  });

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const name = params.get("name");
    const date = params.get("date");
    const time = params.get("time");
    const customerName = params.get("customerName");
    const email = params.get("email");

    if (type) {
      setPurchaseData({
        type,
        name,
        date,
        time,
        customerName,
        email,
      });
    }
  }, []);

  // Redirect to external thank you page if configured
  useEffect(() => {
    if (facility?.useExternalThankYouPage && facility?.thankYouPageExternalUrl) {
      window.location.href = facility.thankYouPageExternalUrl;
    }
  }, [facility]);

  if (!purchaseData || !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getTypeSpecificMessage = () => {
    switch (purchaseData.type) {
      case "booking":
        return "Your bay has been reserved";
      case "lesson":
        return "Your lesson has been scheduled";
      case "fitting":
        return "Your club fitting has been booked";
      case "membership":
        return "Welcome to our membership";
      case "transformation_package":
        return "Your transformation package is ready";
      case "lesson_package":
        return "Your lesson package is ready";
      default:
        return "Your purchase is complete";
    }
  };

  const showsDateTime = ["booking", "lesson", "fitting"].includes(purchaseData.type);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: `${facility.primaryColor || "#16a34a"}10` }}
    >
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div 
              className="rounded-full p-4"
              style={{ backgroundColor: `${facility.primaryColor || "#16a34a"}20` }}
            >
              <CheckCircle2 
                className="w-16 h-16" 
                style={{ color: facility.primaryColor || "#16a34a" }}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Thank You{purchaseData.customerName ? `, ${purchaseData.customerName}` : ""}!</h1>
            <p className="text-xl text-muted-foreground">
              {getTypeSpecificMessage()}
            </p>
          </div>

          {/* Custom Message */}
          {facility.thankYouPageMessage && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{facility.thankYouPageMessage}</p>
            </div>
          )}

          {/* Purchase Details */}
          {purchaseData.name && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="font-semibold text-lg">{purchaseData.name}</h2>
              
              {showsDateTime && purchaseData.date && purchaseData.time && (
                <div className="grid gap-3 text-left">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-muted-foreground">
                        {format(new Date(purchaseData.date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-muted-foreground">{purchaseData.time}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Facility Information */}
          {(facility.address || facility.phone || facility.email) && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold">Visit Us At</h3>
              <div className="grid gap-3 text-left text-sm">
                {facility.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{facility.address}</p>
                    </div>
                  </div>
                )}
                {facility.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-muted-foreground">{facility.phone}</p>
                    </div>
                  </div>
                )}
                {facility.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{facility.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirmation Email Notice */}
          {purchaseData.email && (
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="text-muted-foreground">
                A confirmation email has been sent to <strong>{purchaseData.email}</strong>
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4">
            <Button
              size="lg"
              style={{ 
                backgroundColor: facility.primaryColor || "#16a34a",
                color: "white"
              }}
              onClick={() => setLocation("/")}
              data-testid="button-return-home"
              className="hover-elevate active-elevate-2"
            >
              Return to Homepage
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
