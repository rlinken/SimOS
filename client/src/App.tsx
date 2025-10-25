import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import BaysPage from "@/pages/bays";
import BookingsPage from "@/pages/bookings";
import MembersPage from "@/pages/members";
import MembershipsPage from "@/pages/memberships";
import LessonsPage from "@/pages/lessons";
import FittingsPage from "@/pages/fittings";
import FacilitiesPage from "@/pages/facilities";
import SettingsPage from "@/pages/settings";
import OnboardingPage from "@/pages/onboarding";
import WidgetCalendar from "@/pages/widget-calendar";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/bays" component={BaysPage} />
      <Route path="/bookings" component={BookingsPage} />
      <Route path="/members" component={MembersPage} />
      <Route path="/memberships" component={MembershipsPage} />
      <Route path="/lessons" component={LessonsPage} />
      <Route path="/fittings" component={FittingsPage} />
      <Route path="/facilities" component={FacilitiesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Custom sidebar width for golf application
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/widget/calendar/:facilityId" component={WidgetCalendar} />
        <UnauthenticatedRoutes />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/widget/calendar/:facilityId" component={WidgetCalendar} />
      <Route>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center h-16 px-6 border-b gap-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex-1" />
              </header>
              <main className="flex-1 overflow-auto p-8">
                <AuthenticatedRoutes />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
