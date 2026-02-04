import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, ThumbsUp, TrendingUp, Sparkles } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-reviews-title">Reviews</h1>
          <p className="text-muted-foreground">
            Collect and showcase customer reviews to build trust
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="w-4 h-4 mr-1" />
          Coming Soon
        </Badge>
      </div>

      <Card className="p-12 text-center bg-gradient-to-br from-amber-500/5 to-amber-500/10">
        <Star className="w-16 h-16 mx-auto text-amber-500 mb-6" />
        <h2 className="text-2xl font-bold mb-4">Review Collection Coming Soon!</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          We're building an automated review collection system that integrates seamlessly with your
          booking confirmations and follow-up emails to help you gather authentic customer feedback.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
          <div className="p-4 bg-background rounded-lg">
            <MessageCircle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">Automated Requests</h3>
            <p className="text-sm text-muted-foreground">
              Send review requests automatically after bookings
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <ThumbsUp className="w-8 h-8 mx-auto text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">Embeddable Widgets</h3>
            <p className="text-sm text-muted-foreground">
              Display reviews on your website with beautiful widgets
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <TrendingUp className="w-8 h-8 mx-auto text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">Reputation Insights</h3>
            <p className="text-sm text-muted-foreground">
              Track your ratings and identify areas for improvement
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
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
            <span>Automated review request emails after completed bookings</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
            <span>Review widgets for your website and booking confirmation pages</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
            <span>Integration with Journey automations for follow-up sequences</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
            <span>Option to redirect happy customers to Google/Yelp reviews</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
            <span>Incentive rewards for customers who leave reviews</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
