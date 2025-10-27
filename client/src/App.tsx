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
import MemberDashboard from "@/pages/member-dashboard";
import BaysPage from "@/pages/bays";
import BookingsPage from "@/pages/bookings";
import MembersPage from "@/pages/members";
import MembershipsPage from "@/pages/memberships";
import StaffPage from "@/pages/staff";
import OfferingsPage from "@/pages/offerings";
import ProductsPage from "@/pages/products";
import LessonsPage from "@/pages/lessons";
import FittingsPage from "@/pages/fittings";
import FacilitiesPage from "@/pages/facilities";
import SettingsPage from "@/pages/settings";
import OnboardingPage from "@/pages/onboarding";
import WidgetCalendar from "@/pages/widget-calendar";
import WidgetRental from "@/pages/widget-rental";
import WidgetLesson from "@/pages/widget-lesson";
import WidgetFitting from "@/pages/widget-fitting";
import AccountPage from "@/pages/account";
import SchedulePage from "@/pages/schedule";
import ContactsPage from "@/pages/contacts";
import SalesPage from "@/pages/sales";
import TransformationPackagesPage from "@/pages/transformation-packages";
import BuyMembership from "@/pages/buy-membership";
import BuyTransformationPackage from "@/pages/buy-transformation-package";
import TrackmanSettings from "@/pages/trackman-settings";
import OrdersPage from "@/pages/orders";
import ThankYouPage from "@/pages/thank-you";
import EventsPage from "@/pages/events";

function AuthenticatedRoutes() {
  const { user } = useAuth();
  
  // Show customer dashboard for customers, admin dashboard for staff
  const DashboardComponent = (user?.role === "customer" || user?.role === "member") ? MemberDashboard : Dashboard;
  
  return (
    <Switch>
      <Route path="/" component={DashboardComponent} />
      <Route path="/schedule" component={SchedulePage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/sales" component={SalesPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/bays" component={BaysPage} />
      <Route path="/bookings" component={BookingsPage} />
      <Route path="/members" component={MembersPage} />
      <Route path="/memberships" component={MembershipsPage} />
      <Route path="/transformation-packages" component={TransformationPackagesPage} />
      <Route path="/staff" component={StaffPage} />
      <Route path="/offerings" component={OfferingsPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/lessons" component={LessonsPage} />
      <Route path="/fittings" component={FittingsPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/facilities" component={FacilitiesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/trackman-settings" component={TrackmanSettings} />
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
        <Route path="/widget/rental/:facilityId" component={WidgetRental} />
        <Route path="/widget/lesson/:facilityId/:lessonOfferId" component={WidgetLesson} />
        <Route path="/widget/fitting/:facilityId" component={WidgetFitting} />
        <Route path="/buy/membership/:id" component={BuyMembership} />
        <Route path="/buy/transformation-package/:id" component={BuyTransformationPackage} />
        <Route path="/thank-you" component={ThankYouPage} />
        <UnauthenticatedRoutes />
      </Switch>
    );
  }

  // Widget and public purchase routes don't need sidebar
  const isPublicRoute = window.location.pathname.startsWith('/widget/') || 
                        window.location.pathname.startsWith('/buy/') ||
                        window.location.pathname === '/thank-you';

  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/widget/calendar/:facilityId" component={WidgetCalendar} />
        <Route path="/widget/rental/:facilityId" component={WidgetRental} />
        <Route path="/widget/lesson/:facilityId/:lessonOfferId" component={WidgetLesson} />
        <Route path="/widget/fitting/:facilityId" component={WidgetFitting} />
        <Route path="/buy/membership/:id" component={BuyMembership} />
        <Route path="/buy/transformation-package/:id" component={BuyTransformationPackage} />
        <Route path="/thank-you" component={ThankYouPage} />
      </Switch>
    );
  }

  return (
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
