import { useState } from "react";
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
  Sparkles,
  Radio,
  ShoppingCart,
  ShoppingBag,
  CalendarRange,
  ChevronDown,
  Mail,
  Megaphone,
  MessageSquare,
  FileText,
  Share2,
  Star,
  Route,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

function getMenuItems(user: User | undefined) {
  if (!user) return { main: [], business: [], operations: [], marketing: [], settings: [] };

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "owner" || user.role === "administrator";
  const isInstructor = user.role === "instructor";
  const isCustomer = user.role === "customer" || user.role === "member";

  const main = [];
  const business = [];
  const operations = [];
  const marketing = [];
  const settings = [];

  // Main Navigation
  main.push({
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  });

  // Customer-only items
  if (isCustomer) {
    main.push({
      title: "Account",
      url: "/account",
      icon: UserIcon,
    });
  }

  // Super Admin only
  if (isSuperAdmin) {
    main.push({
      title: "Facilities",
      url: "/facilities",
      icon: Building2,
    });
  }

  // Operations - Daily Activities (Admins only)
  if (isSuperAdmin || isAdmin) {
    operations.push(
      {
        title: "Schedule",
        url: "/schedule",
        icon: CalendarDays,
      },
      {
        title: "Bookings",
        url: "/bookings",
        icon: Calendar,
      },
      {
        title: "Orders",
        url: "/orders",
        icon: ShoppingCart,
      }
    );
  }

  // Lessons (Instructors, Admins)
  if (isInstructor || isSuperAdmin || isAdmin) {
    operations.push({
      title: "Lessons",
      url: "/lessons",
      icon: GraduationCap,
    });
  }

  // Fittings (Admins)
  if (isSuperAdmin || isAdmin) {
    operations.push({
      title: "Fittings",
      url: "/fittings",
      icon: Target,
    });
  }

  // Business - Configuration & Setup (Admins only)
  if (isSuperAdmin || isAdmin) {
    business.push(
      {
        title: "Events",
        url: "/events",
        icon: CalendarRange,
      },
      {
        title: "Memberships",
        url: "/memberships",
        icon: CreditCard,
      },
      {
        title: "Packages",
        url: "/transformation-packages",
        icon: Sparkles,
      },
      {
        title: "Contacts",
        url: "/contacts",
        icon: UserPlus,
      },
      {
        title: "Members",
        url: "/members",
        icon: Users,
      },
      {
        title: "Sales",
        url: "/sales",
        icon: DollarSign,
      },
      {
        title: "Offers",
        url: "/offerings",
        icon: Package,
      },
      {
        title: "Products",
        url: "/products",
        icon: ShoppingBag,
      },
      {
        title: "Staff",
        url: "/staff",
        icon: UserCog,
      }
    );

    // Marketing - Automation & Campaigns (Admins only)
    marketing.push(
      {
        title: "Journeys",
        url: "/marketing/journeys",
        icon: Route,
      },
      {
        title: "Broadcasts",
        url: "/marketing/broadcasts",
        icon: Megaphone,
      },
      {
        title: "SMS",
        url: "/marketing/sms",
        icon: MessageSquare,
      },
      {
        title: "Forms",
        url: "/marketing/forms",
        icon: FileText,
      },
      {
        title: "Refer A Friend",
        url: "/marketing/referrals",
        icon: Share2,
      },
      {
        title: "Reviews",
        url: "/marketing/reviews",
        icon: Star,
      }
    );
  }

  // Settings - available to all users
  settings.push({
    title: "Settings",
    url: "/settings",
    icon: Settings,
  });

  return { main, business, operations, marketing, settings };
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);

  const { main, business, operations, marketing, settings } = getMenuItems(user);

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold">GolfSimOS</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard (Main Navigation) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
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

        {/* Operations - Daily Activities (Collapsible) */}
        {operations.length > 0 && (
          <SidebarGroup>
            <Collapsible
              open={operationsOpen}
              onOpenChange={setOperationsOpen}
              className="group/collapsible"
            >
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover-elevate active-elevate-2 rounded-md px-2 py-1.5 cursor-pointer">
                  <span>Operations</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      operationsOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {operations.map((item) => (
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Business - Configuration & Setup (Collapsible) */}
        {business.length > 0 && (
          <SidebarGroup>
            <Collapsible
              open={businessOpen}
              onOpenChange={setBusinessOpen}
              className="group/collapsible"
            >
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover-elevate active-elevate-2 rounded-md px-2 py-1.5 cursor-pointer">
                  <span>Business</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      businessOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {business.map((item) => (
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Marketing - Automation & Campaigns (Collapsible) */}
        {marketing.length > 0 && (
          <SidebarGroup>
            <Collapsible
              open={marketingOpen}
              onOpenChange={setMarketingOpen}
              className="group/collapsible"
            >
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover-elevate active-elevate-2 rounded-md px-2 py-1.5 cursor-pointer">
                  <span>Marketing</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      marketingOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {marketing.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url || location.startsWith(item.url + "/")}
                          data-testid={`nav-marketing-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Settings */}
        {settings.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {settings.map((item) => (
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
        )}
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
