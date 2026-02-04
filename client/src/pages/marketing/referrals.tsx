import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Gift, Users, DollarSign, Sparkles } from "lucide-react";

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-referrals-title">Refer A Friend</h1>
          <p className="text-muted-foreground">
            Grow your business through customer referrals and rewards
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="w-4 h-4 mr-1" />
          Coming Soon
        </Badge>
      </div>

      <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Share2 className="w-16 h-16 mx-auto text-primary mb-6" />
        <h2 className="text-2xl font-bold mb-4">Referral Program Coming Soon!</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          We're building a powerful referral system that will help you turn your happy customers
          into brand ambassadors. Reward customers for referring friends and watch your business grow.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
          <div className="p-4 bg-background rounded-lg">
            <Gift className="w-8 h-8 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-2">Custom Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Offer discounts, free sessions, or credits for successful referrals
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <Users className="w-8 h-8 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-2">Easy Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Customers can share via email, SMS, or unique referral links
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <DollarSign className="w-8 h-8 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-2">Track ROI</h3>
            <p className="text-sm text-muted-foreground">
              See which referrals convert and measure your program's success
            </p>
          </div>
        </div>

        <Button disabled className="opacity-75">
          <Sparkles className="w-4 h-4 mr-2" />
          Notify Me When Available
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">What to Expect</h3>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <span>Customizable referral rewards (discounts, credits, free sessions)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <span>Unique referral links for each customer</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <span>Automated reward fulfillment when referrals convert</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <span>Integration with email and SMS journeys for referral reminders</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
            <span>Detailed analytics on referral performance</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
