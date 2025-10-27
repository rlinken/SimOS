import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function TrialBanner() {
  const { user } = useAuth();
  const facility = (user as any)?.facility;

  if (!facility || facility.subscriptionStatus !== "trialing" || !facility.trialEndAt) {
    return null;
  }

  const trialEnd = new Date(facility.trialEndAt);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Don't show if trial has expired
  if (daysRemaining < 0) {
    return null;
  }

  const getBannerVariant = () => {
    if (daysRemaining <= 3) return "destructive";
    if (daysRemaining <= 7) return "default";
    return "default";
  };

  const getMessage = () => {
    if (daysRemaining === 0) {
      return "Your trial ends today";
    } else if (daysRemaining === 1) {
      return "Your trial ends tomorrow";
    } else {
      return `Your trial ends in ${daysRemaining} days`;
    }
  };

  return (
    <Alert 
      variant={getBannerVariant()} 
      className="rounded-none border-x-0 border-t-0"
      data-testid="banner-trial"
    >
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span data-testid="text-trial-message">
          {getMessage()}. Upgrade to continue using GolfSimOS after your trial.
        </span>
        <Button 
          variant="outline" 
          size="sm"
          className="ml-4 flex-shrink-0"
          data-testid="button-upgrade-trial"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
