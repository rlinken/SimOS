import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Smartphone, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CollectPaymentDialogProps {
  order: {
    id: string;
    type: "booking" | "lesson" | "fitting" | "transformation_package" | "membership";
    customer: {
      firstName: string;
      lastName: string;
    };
    description: string;
    amount: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectPaymentDialog({
  order,
  open,
  onOpenChange,
}: CollectPaymentDialogProps) {
  const { toast } = useToast();
  const [paymentType, setPaymentType] = useState<"card_on_file" | "new_card" | "pay_at_desk">(
    "card_on_file"
  );

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;

      let endpoint = "";
      switch (order.type) {
        case "booking":
          endpoint = `/api/bookings/${order.id}`;
          break;
        case "lesson":
          endpoint = `/api/lessons/${order.id}`;
          break;
        case "fitting":
          endpoint = `/api/fittings/${order.id}`;
          break;
        case "transformation_package":
          endpoint = `/api/transformation-package-enrollments/${order.id}`;
          break;
        case "membership":
          endpoint = `/api/membership-enrollments/${order.id}`;
          break;
        default:
          throw new Error("Invalid order type");
      }

      return apiRequest("PATCH", endpoint, {
        paymentStatus: "paid",
        paymentMethod: paymentType, // Send enum value directly
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fittings"] });
      onOpenChange(false);
      toast({
        title: "Payment Collected",
        description:
          paymentType === "card_on_file"
            ? "Payment charged to card on file successfully"
            : "Payment processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to collect payment",
        variant: "destructive",
      });
    },
  });

  const handleProcessPayment = () => {
    markAsPaidMutation.mutate();
  };

  if (!order) return null;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(order.amount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-collect-payment">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>
            Choose how to process payment for this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Review Summary */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-3">Payment Details</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="text-sm font-medium">
                  {order.customer.firstName} {order.customer.lastName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Description</span>
                <span className="text-sm font-medium">{order.description}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Total Amount</span>
                <span className="text-lg font-bold text-primary">
                  {formattedAmount}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(value) =>
                setPaymentType(value as "card_on_file" | "new_card" | "pay_at_desk")
              }
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate active-elevate-2">
                <RadioGroupItem
                  value="card_on_file"
                  id="card_on_file"
                  data-testid="radio-card-on-file"
                />
                <Label htmlFor="card_on_file" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <CreditCard className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Card on File</div>
                    <div className="text-xs text-muted-foreground">
                      Charge customer's saved card
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate active-elevate-2">
                <RadioGroupItem
                  value="new_card"
                  id="new_card"
                  data-testid="radio-new-card"
                />
                <Label htmlFor="new_card" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Smartphone className="w-4 h-4" />
                  <div>
                    <div className="font-medium">New Card / Digital Payment</div>
                    <div className="text-xs text-muted-foreground">
                      Process payment with new card or digital wallet
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate active-elevate-2">
                <RadioGroupItem value="pay_at_desk" id="pay_at_desk" data-testid="radio-pay-at-desk" />
                <Label htmlFor="pay_at_desk" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <DollarSign className="w-4 h-4" />
                  <div>
                    <div className="font-medium">POS / Cash</div>
                    <div className="text-xs text-muted-foreground">
                      Payment processed at point of sale
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={markAsPaidMutation.isPending}
            data-testid="button-process-payment"
          >
            {markAsPaidMutation.isPending ? "Processing..." : "Process Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
