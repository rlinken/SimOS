import {
  Calendar,
  LayoutDashboard,
  Users,
  MapPin,
  GraduationCap,
  Target,
  Settings,
  Building2,
  CreditCard,
  User as UserIcon,
  CalendarDays,
  UserPlus,
  DollarSign,
  Package,
  UserCog,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

function getMenuItems(user: User | undefined) {
  if (!user) return [];

  const isSuperAdmin = user.role === "super_admin";
  const isFacilityAdmin = user.role === "facility_admin";
  const isInstructor = user.role === "instructor";
  const isCustomer = user.role === "customer" || user.role === "member";

  const items = [];

  // Dashboard
  items.push({
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  });

  // Customer-only items
  if (isCustomer) {
    items.push({
      title: "Account",
      url: "/account",
      icon: UserIcon,
    });
  }

  // Super Admin only
  if (isSuperAdmin) {
    items.push({
      title: "Facilities",
      url: "/facilities",
      icon: Building2,
    });
  }

  // Facility Admin & Super Admin
  if (isSuperAdmin || isFacilityAdmin) {
    items.push(
      {
        title: "Schedule",
        url: "/schedule",
        icon: CalendarDays,
      },
      {
        title: "Contacts",
        url: "/contacts",
        icon: UserPlus,
      },
      {
        title: "Sales",
        url: "/sales",
        icon: DollarSign,
      },
      {
        title: "Bays",
        url: "/bays",
        icon: MapPin,
      },
      {
        title: "Bookings",
        url: "/bookings",
        icon: Calendar,
      },
      {
        title: "Members",
        url: "/members",
        icon: Users,
      },
      {
        title: "Memberships",
        url: "/memberships",
        icon: CreditCard,
      },
      {
        title: "Offers",
        url: "/offerings",
        icon: Package,
      },
      {
        title: "Staff",
        url: "/staff",
        icon: UserCog,
      }
    );
  }

  // Lessons (Instructors, Admins)
  if (isInstructor || isSuperAdmin || isFacilityAdmin) {
    items.push({
      title: "Lessons",
      url: "/lessons",
      icon: GraduationCap,
    });
  }

  // Fittings (Admins)
  if (isSuperAdmin || isFacilityAdmin) {
    items.push({
      title: "Fittings",
      url: "/fittings",
      icon: Target,
    });
  }

  // Settings
  items.push({
    title: "Settings",
    url: "/settings",
    icon: Settings,
  });

  return items;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const menuItems = getMenuItems(user);

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold">GolfSimOS</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              style={{ objectFit: "cover" }}
            />
            <AvatarFallback className="text-xs">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.role?.replace("_", " ")}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          asChild
          data-testid="button-logout"
        >
          <a href="/api/logout">Sign Out</a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
