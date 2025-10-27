import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Users, CreditCard, CheckCircle2, BarChart } from "lucide-react";

export default function GetStartedPage() {
  const handleGetStarted = () => {
    // Redirect to Replit Auth login
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">GolfSimOS</span>
          </div>
          <Button variant="ghost" onClick={handleGetStarted} data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6" data-testid="text-hero-title">
            Complete Management for Indoor Golf Facilities
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Streamline bookings, memberships, lessons, and fittings with our all-in-one platform designed specifically for golf simulator businesses.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8"
            onClick={handleGetStarted}
            data-testid="button-get-started"
          >
            Get Started Free
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Real-time bay booking with intelligent allocation and automated reminders for your customers.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Membership Management</h3>
            <p className="text-muted-foreground">
              Create custom membership tiers with flexible pricing, credits, and automatic renewals.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-muted-foreground">
              Accept payments online with Stripe integration or record cash/check payments manually.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Analytics & Reporting</h3>
            <p className="text-muted-foreground">
              Track revenue, bookings, and member activity with comprehensive reporting dashboards.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Bay Management</h3>
            <p className="text-muted-foreground">
              Configure unlimited bays with custom tiers, pricing, and availability settings.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Quick Setup</h3>
            <p className="text-muted-foreground">
              Get started in minutes with our guided onboarding process. No technical expertise required.
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join golf facilities across the country using GolfSimOS to manage their operations.
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={handleGetStarted}
              data-testid="button-cta-start"
            >
              Create Your Facility
            </Button>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 GolfSimOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
