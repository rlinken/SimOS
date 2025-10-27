import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ShoppingCart, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ProductData {
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    price: string;
    imageUrl: string | null;
    stockQuantity: number | null;
  };
  facility: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  };
}

const customerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function BuyProduct() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isPurchased, setIsPurchased] = useState(false);

  const { data, isLoading, error } = useQuery<ProductData>({
    queryKey: [`/api/public/product/${id}`],
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      quantity: 1,
    },
  });

  const quantity = form.watch("quantity");
  const totalPrice = data ? parseFloat(data.product.price) * quantity : 0;

  const purchaseMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      // Create a checkout session for the product purchase
      const response = await apiRequest("POST", "/api/public/create-product-checkout", {
        ...customerData,
        productId: id,
        facilityId: data?.facility.id,
      });
      return response;
    },
    onSuccess: (response: any) => {
      if (response.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = response.checkoutUrl;
      } else {
        setIsPurchased(true);
        toast({
          title: "Success!",
          description: "Your purchase is complete. Check your email for details.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error.message || "Unable to complete purchase. Please try again.",
      });
    },
  });

  const onSubmit = (formData: CustomerFormData) => {
    purchaseMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-error-title">Error Loading Product</CardTitle>
            <CardDescription data-testid="text-error-message">
              {error.message || "Unable to load product details. Please try again later."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-not-found-title">Product Not Found</CardTitle>
            <CardDescription data-testid="text-not-found-message">
              The product you're looking for doesn't exist or is no longer available.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { product, facility } = data;
  const isOutOfStock = product.stockQuantity !== null && product.stockQuantity <= 0;

  if (isPurchased) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" data-testid="icon-success" />
            </div>
            <CardTitle data-testid="text-success-title">Purchase Complete!</CardTitle>
            <CardDescription data-testid="text-success-message">
              Thank you for your purchase at {facility.name}! Check your email for receipt details.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl py-8">
        {/* Facility Branding */}
        {facility.logoUrl && (
          <div className="mb-8 text-center">
            <img src={facility.logoUrl} alt={facility.name} className="mx-auto h-16 object-contain" data-testid="img-facility-logo" />
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Package className="h-4 w-4" />
                <span className="capitalize" data-testid="text-product-category">{product.category}</span>
              </div>
              <CardTitle className="text-2xl" data-testid="text-product-name">{product.name}</CardTitle>
              {product.description && (
                <CardDescription className="text-base" data-testid="text-product-description">{product.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Image */}
              {product.imageUrl && (
                <div className="rounded-md overflow-hidden bg-muted">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-48 object-cover" 
                    data-testid="img-product"
                  />
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary" data-testid="text-product-price">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                <span className="text-muted-foreground">each</span>
              </div>

              {/* Stock Status */}
              {product.stockQuantity !== null && (
                <div className="flex items-center gap-2">
                  {isOutOfStock ? (
                    <span className="text-sm text-destructive font-medium" data-testid="text-out-of-stock">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground" data-testid="text-in-stock">
                      {product.stockQuantity} in stock
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Secure online payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Pick up at facility</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground pt-4 border-t" data-testid="text-facility-name">
                Available at <strong>{facility.name}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Purchase Form */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Purchase</CardTitle>
              <CardDescription>Enter your details to buy this product</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              data-testid="input-first-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Smith"
                              data-testid="input-last-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(555) 123-4567"
                            data-testid="input-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max={product.stockQuantity || undefined}
                            data-testid="input-quantity"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Total Price */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-medium">Total:</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-total-price">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={purchaseMutation.isPending || isOutOfStock}
                      data-testid="button-purchase"
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isOutOfStock ? (
                        "Out of Stock"
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Complete Purchase
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    By purchasing, you agree to our terms of service and privacy policy.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
