import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MembershipTier, InsertMembershipTier } from "@shared/schema";
import { insertMembershipTierSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MembershipsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tiers, isLoading } = useQuery<MembershipTier[]>({
    queryKey: ["/api/memberships"],
  });

  const form = useForm<InsertMembershipTier>({
    resolver: zodResolver(insertMembershipTierSchema),
    defaultValues: {
      name: "",
      description: "",
      tierLevel: 1,
      monthlyPrice: "0",
      hourlyRate: "0",
      monthlyHours: 0,
      allowedBayTiers: ["standard"],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMembershipTier) => {
      return apiRequest("POST", "/api/memberships", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      toast({
        title: "Success",
        description: "Membership tier created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Memberships</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Membership Tiers
          </h1>
          <p className="text-muted-foreground">
            Create and manage membership plans
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-membership">
              <Plus className="w-4 h-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Membership Tier</DialogTitle>
              <DialogDescription>
                Define a new membership level with pricing and benefits
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Gold"
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tierLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Level (1-3)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="3"
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                            data-testid="input-tier-level"
                          />
                        </FormControl>
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
                          value={field.value || ""}
                          placeholder="Membership benefits and features"
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="monthlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="99.00"
                            data-testid="input-monthly-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Hours</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || 0}
                            type="number"
                            min="0"
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                            data-testid="input-monthly-hours"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-hourly-rate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Tier"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tiers Grid */}
      {!tiers || tiers.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No membership tiers yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first membership tier to get started
          </p>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-membership">
            <Plus className="w-4 h-4 mr-2" />
            Create First Tier
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className="p-6 space-y-6 hover-elevate"
              data-testid={`card-tier-${tier.id}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{tier.name}</h3>
                  <div className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    Level {tier.tierLevel}
                  </div>
                </div>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold font-mono">
                  ${parseFloat(tier.monthlyPrice).toFixed(2)}
                  <span className="text-base font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{tier.monthlyHours} hours per month</span>
                </div>
                {tier.hourlyRate && parseFloat(tier.hourlyRate) > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      ${parseFloat(tier.hourlyRate).toFixed(2)}/hour after
                    </span>
                  </div>
                )}
                {Array.isArray(tier.allowedBayTiers) &&
                  tier.allowedBayTiers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="capitalize">
                        Access to {tier.allowedBayTiers.join(", ")} bays
                      </span>
                    </div>
                  )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
