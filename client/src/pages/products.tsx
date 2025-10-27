import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product, type InsertProduct } from "@shared/schema";
import { Plus, Package, DollarSign, BarChart, AlertTriangle, Trash2, ImagePlus } from "lucide-react";
import { TagsInput } from "@/components/ui/tags-input";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "other",
      price: 0,
      costPrice: undefined,
      sku: "",
      barcode: "",
      stockQuantity: 0,
      lowStockThreshold: 5,
      imageUrl: "",
      tags: [],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) =>
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product created",
        description: "The product has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProduct> }) =>
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProduct(null);
      form.reset();
    }
  };

  const handleCardClick = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      price: product.price,
      costPrice: product.costPrice ?? undefined,
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      imageUrl: product.imageUrl ?? "",
      tags: product.tags ?? [],
      isActive: product.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(productId);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      clubs: "Golf Clubs",
      balls: "Golf Balls",
      gloves: "Gloves",
      apparel: "Apparel",
      accessories: "Accessories",
      training_aids: "Training Aids",
      gift_cards: "Gift Cards",
      other: "Other",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      clubs: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      balls: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      gloves: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      apparel: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      accessories: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      training_aids: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      gift_cards: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[category] || colors.other;
  };

  const calculateProfitMargin = (price: number | undefined, costPrice: number | null | undefined) => {
    if (!price || !costPrice) return null;
    if (price === 0) return null;
    return ((price - costPrice) / price * 100).toFixed(1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">
              Manage physical merchandise inventory
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product" onClick={() => setEditingProduct(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Update product details and inventory"
                    : "Add a new product to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => {
                    if (editingProduct) {
                      updateMutation.mutate({ id: editingProduct.id, data });
                    } else {
                      createMutation.mutate(data);
                    }
                  })}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Titleist Pro V1 Golf Balls"
                              data-testid="input-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="clubs">Golf Clubs</SelectItem>
                              <SelectItem value="balls">Golf Balls</SelectItem>
                              <SelectItem value="gloves">Gloves</SelectItem>
                              <SelectItem value="apparel">Apparel</SelectItem>
                              <SelectItem value="accessories">Accessories</SelectItem>
                              <SelectItem value="training_aids">Training Aids</SelectItem>
                              <SelectItem value="gift_cards">Gift Cards</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Product description..."
                            rows={3}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              data-testid="input-price"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="costPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Price (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              data-testid="input-cost-price"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            For profit margin tracking
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., BALL-TIT-PV1"
                              data-testid="input-sku"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., 123456789012"
                              data-testid="input-barcode"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Quantity</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-stock-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lowStockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Stock Alert Threshold</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-low-stock-threshold"
                            />
                          </FormControl>
                          <FormDescription>
                            Get alerts when stock falls below this number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Image</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              {...field}
                              placeholder="Image URL (optional)"
                              data-testid="input-image-url"
                            />
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              onGetUploadParameters={async () => {
                                const response = await apiRequest("POST", "/api/objects/upload");
                                const json = await response.json();
                                return {
                                  method: "PUT" as const,
                                  url: json.uploadURL,
                                };
                              }}
                              onComplete={async (result: UploadResult) => {
                                if (result.successful.length > 0) {
                                  const uploadURL = result.successful[0].uploadURL as string;
                                  const objectPath = uploadURL?.split("/objects/")[1]?.split("?")[0];
                                  if (objectPath) {
                                    const imageUrl = `/objects/${objectPath}`;
                                    field.onChange(imageUrl);
                                    toast({
                                      title: "Image uploaded",
                                      description: "Product image has been uploaded successfully",
                                    });
                                  }
                                }
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <ImagePlus className="w-4 h-4 mr-2" />
                              Upload Image
                            </ObjectUploader>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Link to an image or upload one
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (Optional)</FormLabel>
                        <FormControl>
                          <TagsInput
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder="Add tags for automation..."
                          />
                        </FormControl>
                        <FormDescription>
                          Add tags to trigger automated workflows (webhooks, Zapier)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="w-4 h-4"
                            data-testid="checkbox-active"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Active (visible for sale)</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                    >
                      {editingProduct
                        ? (updateMutation.isPending ? "Updating..." : "Update Product")
                        : (createMutation.isPending ? "Creating..." : "Create Product")
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading products...</div>
        </div>
      ) : !products || products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Package className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No products yet</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-product">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const profitMargin = calculateProfitMargin(product.price, product.costPrice);
              const isLowStock = product.stockQuantity <= product.lowStockThreshold;

              return (
                <Card
                  key={product.id}
                  className="p-6 hover-elevate cursor-pointer relative"
                  data-testid={`product-card-${product.id}`}
                  onClick={() => handleCardClick(product)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={getCategoryColor(product.category)}>
                            {getCategoryLabel(product.category)}
                          </Badge>
                          {!product.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {isLowStock && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                    </div>

                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">${product.price}</span>
                        {profitMargin && (
                          <Badge variant="outline" className="ml-auto">
                            <BarChart className="w-3 h-3 mr-1" />
                            {profitMargin}% margin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>
                          {product.stockQuantity} in stock
                          {product.sku && ` • SKU: ${product.sku}`}
                        </span>
                      </div>
                    </div>

                    {product.tags && product.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap pt-2 border-t">
                        {product.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(product);
                        }}
                        data-testid={`button-edit-${product.id}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => handleDelete(e, product.id)}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
