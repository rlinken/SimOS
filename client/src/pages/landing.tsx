import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Award,
  Target,
  BarChart3,
  Zap,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">GolfSimOS</span>
            </div>
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight">
                  The Operating System for Indoor Golf Facilities
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Unify bay bookings, memberships, lessons, and payments into
                  one powerful platform. Built specifically for golf simulator
                  businesses.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="h-12 px-8" asChild data-testid="button-get-started">
                  <a href="/api/login">Get Started</a>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8" data-testid="button-learn-more">
                  Learn More
                </Button>
              </div>
              <div className="flex flex-wrap gap-8 pt-4">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">
                    Facilities Powered
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">1M+</div>
                  <div className="text-sm text-muted-foreground">
                    Bookings Managed
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right Column - Feature Preview */}
            <div className="relative">
              <Card className="p-6 space-y-6 shadow-lg">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Today's Schedule
                  </div>
                  <div className="text-2xl font-bold">Bay Management</div>
                </div>
                <div className="space-y-3">
                  {[
                    { bay: "Bay 1", time: "10:00 AM", status: "Active", tier: "Premium" },
                    { bay: "Bay 2", time: "11:30 AM", status: "Active", tier: "Standard" },
                    { bay: "Bay 3", time: "2:00 PM", status: "Available", tier: "VIP" },
                    { bay: "Bay 4", time: "4:00 PM", status: "Active", tier: "Premium" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            item.status === "Active" ? "bg-primary" : "bg-muted"
                          }`}
                        />
                        <div>
                          <div className="font-medium">{item.bay}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.tier}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-mono text-muted-foreground">
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything You Need to Run Your Facility
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Replace multiple tools with one comprehensive platform designed
              for golf simulator businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "Smart Bay Booking",
                description:
                  "Real-time availability calendar with intelligent bay assignment based on usage hours and membership tiers.",
              },
              {
                icon: Users,
                title: "Membership Management",
                description:
                  "Create custom membership tiers with hourly credits, discounted rates, and tiered bay access.",
              },
              {
                icon: Clock,
                title: "Lesson Scheduling",
                description:
                  "Manage instructor schedules, student bookings, and track lesson packages with ease.",
              },
              {
                icon: Award,
                title: "Club Fittings",
                description:
                  "Dedicated fitting calendar with intake forms and detailed session notes.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description:
                  "Track revenue, bay utilization, member activity, and business metrics in real-time.",
              },
              {
                icon: Zap,
                title: "Embeddable Widgets",
                description:
                  "Add beautiful booking widgets to your website with customizable branding.",
              },
            ].map((feature, idx) => (
              <Card key={idx} className="p-6 space-y-4 hover-elevate">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Ready to Transform Your Golf Facility?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join hundreds of indoor golf facilities using GolfSimOS to
              streamline operations and grow revenue.
            </p>
          </div>
          <Button size="lg" className="h-12 px-8" asChild data-testid="button-cta-start">
            <a href="/api/login">Start Free Trial</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                <span className="font-bold">GolfSimOS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The complete operating system for indoor golf simulator
                businesses.
              </p>
            </div>
            <div className="space-y-4">
              <div className="font-semibold">Product</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover-elevate cursor-pointer">Features</div>
                <div className="hover-elevate cursor-pointer">Pricing</div>
                <div className="hover-elevate cursor-pointer">Integrations</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-semibold">Company</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover-elevate cursor-pointer">About</div>
                <div className="hover-elevate cursor-pointer">Blog</div>
                <div className="hover-elevate cursor-pointer">Careers</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="font-semibold">Legal</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover-elevate cursor-pointer">Privacy</div>
                <div className="hover-elevate cursor-pointer">Terms</div>
                <div className="hover-elevate cursor-pointer">Security</div>
              </div>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} GolfSimOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
