import { useEffect, useState } from "react";
import { BookingWidget } from "@/components/booking/booking-widget";
import type { BookingWidgetConfig } from "@/components/booking/booking-widget";

/**
 * Standalone Booking Widget Page
 *
 * This page is designed to be embedded via iframe on external websites.
 * It accepts configuration parameters via URL query params.
 *
 * Usage:
 * <iframe
 *   src="https://yourapp.com/widget/booking?facilityId=1&primaryColor=%234CAF50"
 *   width="100%"
 *   height="800px"
 *   frameborder="0"
 * ></iframe>
 */

export default function BookingWidgetPage() {
  const [config, setConfig] = useState<Partial<BookingWidgetConfig>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);

    const widgetConfig: Partial<BookingWidgetConfig> = {
      facilityId: parseInt(params.get("facilityId") || "1"),
      facilityName: params.get("facilityName") || undefined,
      logo: params.get("logo") || undefined,
      primaryColor: params.get("primaryColor") || undefined,
      accentColor: params.get("accentColor") || undefined,
      showPricing: params.get("showPricing") !== "false",
      requirePhone: params.get("requirePhone") !== "false",
      allowGuestCheckout: params.get("allowGuestCheckout") !== "false",
      depositAmount: params.get("depositAmount")
        ? parseFloat(params.get("depositAmount")!)
        : undefined,
      depositType: (params.get("depositType") as "fixed" | "percentage") || "fixed",
    };

    // If facilityId is provided, fetch facility settings
    if (widgetConfig.facilityId) {
      fetchFacilitySettings(widgetConfig.facilityId).then((settings) => {
        setConfig({ ...widgetConfig, ...settings });
        setLoading(false);
      });
    } else {
      setConfig(widgetConfig);
      setLoading(false);
    }

    // Remove scroll from parent if in iframe
    if (window.self !== window.top) {
      document.body.style.overflow = "hidden";
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <BookingWidget config={config} />
    </div>
  );
}

// Fetch facility settings from API
async function fetchFacilitySettings(facilityId: number): Promise<Partial<BookingWidgetConfig>> {
  try {
    // In production, make actual API call
    // const response = await fetch(`/api/facilities/${facilityId}/widget-config`);
    // return await response.json();

    // For now, return mock data
    return {
      facilityName: "Premier Golf Simulator",
      logo: undefined, // Would fetch from facility settings
      primaryColor: "#4CAF50",
      accentColor: "#FF9800",
      depositAmount: 25,
      depositType: "fixed",
    };
  } catch (error) {
    console.error("Failed to fetch facility settings:", error);
    return {};
  }
}
