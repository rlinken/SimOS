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

  const isUrgent = daysRemaining <= 3;

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
    <div 
      className={`border-b px-6 py-3 ${
        isUrgent 
          ? 'bg-destructive/10 border-destructive/20' 
          : 'bg-amber-500/10 border-amber-500/20'
      }`}
      data-testid="banner-trial"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className={`h-4 w-4 ${
            isUrgent ? 'text-destructive' : 'text-amber-600'
          }`} />
          <span className={`text-sm ${
            isUrgent 
              ? 'text-destructive dark:text-destructive' 
              : 'text-amber-900 dark:text-amber-100'
          }`} data-testid="text-trial-message">
            {getMessage()}. Upgrade to continue using GolfSimOS after your trial.
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-shrink-0"
          data-testid="button-upgrade-trial"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}
