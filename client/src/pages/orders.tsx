import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  DollarSign,
  User,
  Package,
  GraduationCap,
  Target,
  CreditCard,
  Sparkles,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerProfileDialog } from "@/components/customer-profile-dialog";
import { CollectPaymentDialog } from "@/components/collect-payment-dialog";

interface Order {
  id: string;
  type: "booking" | "lesson" | "fitting" | "transformation_package" | "membership";
  date: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  description: string;
  amount: string;
  paymentStatus: "paid" | "pending" | "cancelled" | "refunded";
  paymentMethod?: string;
  referredBy?: {
    firstName: string;
    lastName: string;
  };
}

const PAYMENT_STATUS_CONFIG = {
  paid: { label: "Paid", variant: "default" as const, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  pending: { label: "Pending", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  cancelled: { label: "Cancelled", variant: "outline" as const, className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  refunded: { label: "Refunded", variant: "destructive" as const, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const ORDER_TYPE_CONFIG = {
  booking: { label: "Bay Booking", icon: CalendarIcon, color: "text-blue-600" },
  lesson: { label: "Lesson", icon: GraduationCap, color: "text-purple-600" },
  fitting: { label: "Fitting", icon: Target, color: "text-orange-600" },
  transformation_package: { label: "Package", icon: Sparkles, color: "text-pink-600" },
  membership: { label: "Membership", icon: CreditCard, color: "text-green-600" },
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", typeFilter, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: typeFilter,
        status: statusFilter,
        date: dateFilter,
      });
      
      const url = `/api/orders?${params.toString()}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const filteredOrders = orders?.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      order.customer.firstName.toLowerCase().includes(searchLower) ||
      order.customer.lastName.toLowerCase().includes(searchLower) ||
      order.customer.email.toLowerCase().includes(searchLower) ||
      order.description.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  const totalRevenue = filteredOrders?.reduce((sum, order) => {
    if (order.paymentStatus === "paid") {
      return sum + parseFloat(order.amount);
    }
    return sum;
  }, 0) || 0;

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-2">
          View and search all transactions and bookings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold" data-testid="text-total-orders">
                {filteredOrders?.length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold" data-testid="text-total-revenue">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Customers</p>
              <p className="text-2xl font-bold" data-testid="text-unique-customers">
                {filteredOrders
                  ? new Set(filteredOrders.map((o) => o.customer.id)).size
                  : 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Package className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Payments</p>
              <p className="text-2xl font-bold" data-testid="text-pending-payments">
                {filteredOrders?.filter((o) => o.paymentStatus === "pending")
                  .length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, description, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="booking">Bay Bookings</SelectItem>
                <SelectItem value="lesson">Lessons</SelectItem>
                <SelectItem value="fitting">Fittings</SelectItem>
                <SelectItem value="transformation_package">Packages</SelectItem>
                <SelectItem value="membership">Memberships</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-filter">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" data-testid="button-export">
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {(typeFilter !== "all" || statusFilter !== "all" || dateFilter !== "all" || searchTerm) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Active filters:</span>
              {typeFilter !== "all" && (
                <Badge variant="secondary">
                  Type: {ORDER_TYPE_CONFIG[typeFilter as keyof typeof ORDER_TYPE_CONFIG]?.label}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary">
                  Status: {PAYMENT_STATUS_CONFIG[statusFilter as keyof typeof PAYMENT_STATUS_CONFIG]?.label}
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary">Date: {dateFilter}</Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary">Search: "{searchTerm}"</Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Referred By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredOrders && filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const typeConfig = ORDER_TYPE_CONFIG[order.type];
                  const statusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-mono text-xs">
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.date), "MMM d, yyyy")}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.date), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                          <span className="text-sm">{typeConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            setSelectedCustomerId(order.customer.id);
                            setCustomerProfileOpen(true);
                          }}
                          className="text-left hover-elevate active-elevate-2 rounded p-1 -m-1"
                          data-testid={`button-customer-${order.customer.id}`}
                        >
                          <div className="text-sm font-medium text-primary">
                            {order.customer.firstName} {order.customer.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customer.email}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm truncate">{order.description}</div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.amount)}
                      </TableCell>
                      <TableCell>
                        {order.paymentStatus === "pending" ? (
                          <button
                            onClick={() => {
                              setSelectedOrderForPayment(order);
                              setPaymentDialogOpen(true);
                            }}
                            className="hover-elevate active-elevate-2 rounded"
                            data-testid={`button-collect-payment-${order.id}`}
                          >
                            <Badge
                              className={statusConfig.className}
                              data-testid={`badge-status-${order.paymentStatus}`}
                            >
                              {statusConfig.label}
                            </Badge>
                          </button>
                        ) : (
                          <Badge
                            className={statusConfig.className}
                            data-testid={`badge-status-${order.paymentStatus}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.paymentMethod || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.referredBy
                          ? `${order.referredBy.firstName} ${order.referredBy.lastName}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-12 h-12 text-muted-foreground" />
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Orders will appear here once created"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Customer Profile Dialog */}
      <CustomerProfileDialog
        customerId={selectedCustomerId}
        open={customerProfileOpen}
        onOpenChange={setCustomerProfileOpen}
      />

      {/* Payment Collection Dialog */}
      <CollectPaymentDialog
        order={selectedOrderForPayment}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />
    </div>
  );
}
