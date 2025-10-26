import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Mail, Printer, Building2, Phone, MapPin as MapPinIcon, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
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
  };
  facility?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}

const ORDER_TYPE_LABELS = {
  booking: "Bay Booking",
  lesson: "Golf Lesson",
  fitting: "Club Fitting",
  transformation_package: "Transformation Package",
  membership: "Membership",
};

export function ReceiptDialog({ open, onOpenChange, order, facility }: ReceiptDialogProps) {
  const { toast } = useToast();
  const [isEmailing, setIsEmailing] = useState(false);

  const emailReceiptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/orders/${order.id}/email-receipt`, {
        orderType: order.type,
      });
    },
    onSuccess: () => {
      toast({
        title: "Receipt Sent",
        description: `Receipt has been emailed to ${order.customer.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send receipt",
        variant: "destructive",
      });
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Use browser's print to PDF functionality
    window.print();
  };

  const handleEmailReceipt = async () => {
    setIsEmailing(true);
    try {
      await emailReceiptMutation.mutateAsync();
    } finally {
      setIsEmailing(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "PAID";
      case "pending":
        return "PENDING";
      case "cancelled":
        return "CANCELLED";
      case "refunded":
        return "REFUNDED";
      default:
        return status.toUpperCase();
    }
  };

  const facilityInfo = facility || {
    name: "Golf Simulator Facility",
    address: "",
    phone: "",
    email: "",
    website: "",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full" data-testid="dialog-receipt">
        <DialogHeader className="print:hidden">
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        {/* Receipt Content - Print Friendly */}
        <div className="receipt-content space-y-6 p-6 bg-white text-black" id="receipt-content">
          {/* Header with Facility Info */}
          <div className="text-center space-y-2 border-b-2 border-gray-800 pb-4">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="w-6 h-6" />
              <h1 className="text-2xl font-bold">{facilityInfo.name}</h1>
            </div>
            {facilityInfo.address && (
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                <MapPinIcon className="w-4 h-4" />
                <span>{facilityInfo.address}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              {facilityInfo.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{facilityInfo.phone}</span>
                </div>
              )}
              {facilityInfo.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{facilityInfo.email}</span>
                </div>
              )}
              {facilityInfo.website && (
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>{facilityInfo.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Title */}
          <div className="text-center">
            <h2 className="text-xl font-bold">RECEIPT</h2>
            <p className="text-sm text-gray-600 mt-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Customer & Transaction Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-600 mb-2">CUSTOMER INFORMATION</p>
              <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
              <p className="text-gray-600">{order.customer.email}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-600 mb-2">TRANSACTION DETAILS</p>
              <p><span className="font-medium">Date:</span> {format(new Date(order.date), "MMM d, yyyy 'at' h:mm a")}</p>
              <p><span className="font-medium">Status:</span> <span className="font-bold">{getPaymentStatusLabel(order.paymentStatus)}</span></p>
              {order.paymentMethod && (
                <p><span className="font-medium">Method:</span> {order.paymentMethod}</p>
              )}
            </div>
          </div>

          <Separator className="bg-gray-300" />

          {/* Order Details */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left py-2 font-semibold">ITEM</th>
                  <th className="text-left py-2 font-semibold">DESCRIPTION</th>
                  <th className="text-right py-2 font-semibold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-3">{ORDER_TYPE_LABELS[order.type]}</td>
                  <td className="py-3 text-gray-600">{order.description}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(order.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t-2 border-gray-800 pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.amount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">$0.00</span>
            </div>
            <Separator className="bg-gray-300" />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(order.amount)}</span>
            </div>
            {order.paymentStatus === "paid" && (
              <div className="flex justify-between items-center text-sm text-green-700 font-semibold">
                <span>AMOUNT PAID:</span>
                <span>{formatCurrency(order.amount)}</span>
              </div>
            )}
            {order.paymentStatus === "pending" && (
              <div className="flex justify-between items-center text-sm text-amber-700 font-semibold">
                <span>AMOUNT DUE:</span>
                <span>{formatCurrency(order.amount)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-4 mt-6">
            <p>Thank you for your business!</p>
            <p className="mt-1">This receipt was generated on {format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>

        {/* Action Buttons - Hidden when printing */}
        <div className="flex items-center justify-end gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={handlePrint}
            data-testid="button-print-receipt"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={handleEmailReceipt}
            disabled={isEmailing}
            data-testid="button-email-receipt"
          >
            <Mail className="w-4 h-4 mr-2" />
            {isEmailing ? "Sending..." : "Email to Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
