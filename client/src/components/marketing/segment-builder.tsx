import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Tag,
  Zap,
  Crown,
  Plus,
  X,
  Filter,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { MembershipTier } from "@shared/schema";

export interface SegmentRule {
  id: string;
  type: "membership_level" | "tag" | "action" | "custom";
  operator: "is" | "is_not" | "contains" | "has" | "has_not" | "greater_than" | "less_than";
  value: string;
  label?: string;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  matchType: "all" | "any";
  contactCount?: number;
}

interface SegmentBuilderProps {
  value: SegmentRule[];
  onChange: (rules: SegmentRule[]) => void;
  matchType: "all" | "any";
  onMatchTypeChange: (type: "all" | "any") => void;
}

const ruleTypeOptions = [
  { value: "membership_level", label: "Membership Level", icon: Crown },
  { value: "tag", label: "Has Tag", icon: Tag },
  { value: "action", label: "Customer Action", icon: Zap },
];

const actionOptions = [
  { value: "booking_completed", label: "Completed a Booking" },
  { value: "lesson_purchased", label: "Purchased a Lesson" },
  { value: "fitting_completed", label: "Completed a Fitting" },
  { value: "product_purchased", label: "Purchased a Product" },
  { value: "membership_joined", label: "Joined Membership" },
  { value: "membership_expired", label: "Membership Expired" },
  { value: "inactive_30_days", label: "Inactive for 30 Days" },
  { value: "inactive_60_days", label: "Inactive for 60 Days" },
  { value: "inactive_90_days", label: "Inactive for 90 Days" },
  { value: "high_value", label: "High Value Customer ($500+)" },
  { value: "frequent_booker", label: "Frequent Booker (5+ bookings)" },
];

const commonTags = [
  "VIP",
  "Student",
  "Senior",
  "Corporate",
  "Tournament Player",
  "League Member",
  "First Timer",
  "Referral",
  "Staff Referral",
  "Walk In",
  "Event Attendee",
  "Newsletter",
  "Birthday Club",
];

export function SegmentBuilder({ value, onChange, matchType, onMatchTypeChange }: SegmentBuilderProps) {
  const { user } = useAuth();
  const [newRuleType, setNewRuleType] = useState<string>("");

  const { data: membershipTiers = [] } = useQuery<MembershipTier[]>({
    queryKey: ["/api/membership-tiers"],
    enabled: !!user?.facilityId,
  });

  const addRule = () => {
    if (!newRuleType) return;
    
    const newRule: SegmentRule = {
      id: crypto.randomUUID(),
      type: newRuleType as SegmentRule["type"],
      operator: "is",
      value: "",
    };
    onChange([...value, newRule]);
    setNewRuleType("");
  };

  const updateRule = (id: string, updates: Partial<SegmentRule>) => {
    onChange(value.map(rule => rule.id === id ? { ...rule, ...updates } : rule));
  };

  const removeRule = (id: string) => {
    onChange(value.filter(rule => rule.id !== id));
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case "membership_level": return <Crown className="w-4 h-4 text-amber-500" />;
      case "tag": return <Tag className="w-4 h-4 text-blue-500" />;
      case "action": return <Zap className="w-4 h-4 text-green-500" />;
      default: return <Filter className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Match</span>
          <Select value={matchType} onValueChange={(v) => onMatchTypeChange(v as "all" | "any")}>
            <SelectTrigger className="w-24" data-testid="select-match-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL</SelectItem>
              <SelectItem value="any">ANY</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">of the following rules</span>
        </div>
      )}

      {/* Existing Rules */}
      <div className="space-y-3">
        {value.map((rule, index) => (
          <Card key={rule.id} className="p-3">
            <div className="flex items-center gap-3">
              {getRuleIcon(rule.type)}
              
              {rule.type === "membership_level" && (
                <div className="flex-1 flex items-center gap-2">
                  <Select 
                    value={rule.operator} 
                    onValueChange={(v) => updateRule(rule.id, { operator: v as SegmentRule["operator"] })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="is">Is</SelectItem>
                      <SelectItem value="is_not">Is Not</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={rule.value} 
                    onValueChange={(v) => updateRule(rule.id, { value: v })}
                  >
                    <SelectTrigger className="flex-1" data-testid={`select-membership-${index}`}>
                      <SelectValue placeholder="Select membership level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any_member">Any Member</SelectItem>
                      <SelectItem value="non_member">Non-Member</SelectItem>
                      {membershipTiers.map(tier => (
                        <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {rule.type === "tag" && (
                <div className="flex-1 flex items-center gap-2">
                  <Select 
                    value={rule.operator} 
                    onValueChange={(v) => updateRule(rule.id, { operator: v as SegmentRule["operator"] })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="has">Has</SelectItem>
                      <SelectItem value="has_not">Does Not Have</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={rule.value} 
                    onValueChange={(v) => updateRule(rule.id, { value: v })}
                  >
                    <SelectTrigger className="flex-1" data-testid={`select-tag-${index}`}>
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {rule.type === "action" && (
                <div className="flex-1 flex items-center gap-2">
                  <Select 
                    value={rule.operator} 
                    onValueChange={(v) => updateRule(rule.id, { operator: v as SegmentRule["operator"] })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="has">Has</SelectItem>
                      <SelectItem value="has_not">Has Not</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={rule.value} 
                    onValueChange={(v) => updateRule(rule.id, { value: v })}
                  >
                    <SelectTrigger className="flex-1" data-testid={`select-action-${index}`}>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionOptions.map(action => (
                        <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRule(rule.id)}
                data-testid={`button-remove-rule-${index}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Rule */}
      <div className="flex items-center gap-2">
        <Select value={newRuleType} onValueChange={setNewRuleType}>
          <SelectTrigger className="w-48" data-testid="select-add-rule-type">
            <SelectValue placeholder="Add filter rule..." />
          </SelectTrigger>
          <SelectContent>
            {ruleTypeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={addRule}
          disabled={!newRuleType}
          data-testid="button-add-rule"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No filters applied. Add rules to target specific customer segments.
        </p>
      )}
    </div>
  );
}

interface SegmentSelectorProps {
  value: string;
  onChange: (segmentId: string) => void;
  segments: Segment[];
  onCreateNew?: () => void;
}

export function SegmentSelector({ value, onChange, segments, onCreateNew }: SegmentSelectorProps) {
  const predefinedSegments: Segment[] = [
    { id: "all", name: "All Contacts", description: "Everyone in your contact list", rules: [], matchType: "all" },
    { id: "active_members", name: "Active Members", rules: [{ id: "1", type: "membership_level", operator: "is", value: "any_member" }], matchType: "all" },
    { id: "non_members", name: "Non-Members", rules: [{ id: "1", type: "membership_level", operator: "is", value: "non_member" }], matchType: "all" },
    { id: "vip", name: "VIP Customers", rules: [{ id: "1", type: "tag", operator: "has", value: "VIP" }], matchType: "all" },
    { id: "frequent_bookers", name: "Frequent Bookers", rules: [{ id: "1", type: "action", operator: "has", value: "frequent_booker" }], matchType: "all" },
    { id: "high_value", name: "High Value", rules: [{ id: "1", type: "action", operator: "has", value: "high_value" }], matchType: "all" },
  ];

  const allSegments = [...predefinedSegments, ...segments];

  return (
    <div className="space-y-2">
      <Label>Target Audience</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="select-segment">
          <SelectValue placeholder="Select audience segment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Contacts
            </div>
          </SelectItem>
          <SelectItem value="active_members">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Active Members
            </div>
          </SelectItem>
          <SelectItem value="non_members">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Non-Members
            </div>
          </SelectItem>
          <SelectItem value="vip">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              VIP Customers
            </div>
          </SelectItem>
          <SelectItem value="frequent_bookers">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              Frequent Bookers
            </div>
          </SelectItem>
          <SelectItem value="high_value">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              High Value Customers
            </div>
          </SelectItem>
          {segments.length > 0 && (
            <>
              {segments.map(segment => (
                <SelectItem key={segment.id} value={segment.id}>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    {segment.name}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      {onCreateNew && (
        <Button variant="link" size="sm" onClick={onCreateNew} className="px-0" data-testid="button-create-segment">
          <Plus className="w-3 h-3 mr-1" />
          Create custom segment
        </Button>
      )}
    </div>
  );
}

interface CreateSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (segment: Omit<Segment, "id">) => void;
}

export function CreateSegmentDialog({ open, onOpenChange, onSave }: CreateSegmentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<SegmentRule[]>([]);
  const [matchType, setMatchType] = useState<"all" | "any">("all");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      description,
      rules,
      matchType,
    });
    setName("");
    setDescription("");
    setRules([]);
    setMatchType("all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Custom Segment</DialogTitle>
          <DialogDescription>
            Define rules to target specific groups of customers for your campaigns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="segment-name">Segment Name</Label>
            <Input
              id="segment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Premium Members with VIP Tag"
              data-testid="input-segment-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment-description">Description (optional)</Label>
            <Input
              id="segment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this segment..."
              data-testid="input-segment-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Segment Rules</Label>
            <SegmentBuilder
              value={rules}
              onChange={setRules}
              matchType={matchType}
              onMatchTypeChange={setMatchType}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()} data-testid="button-save-segment">
            Save Segment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SegmentRuleSummary({ rules, matchType }: { rules: SegmentRule[]; matchType: "all" | "any" }) {
  if (rules.length === 0) {
    return <span className="text-muted-foreground">All contacts</span>;
  }

  const getRuleDescription = (rule: SegmentRule) => {
    switch (rule.type) {
      case "membership_level":
        return `Membership ${rule.operator === "is" ? "is" : "is not"} ${rule.value}`;
      case "tag":
        return `${rule.operator === "has" ? "Has" : "Does not have"} tag "${rule.value}"`;
      case "action":
        const action = actionOptions.find(a => a.value === rule.value);
        return `${rule.operator === "has" ? "Has" : "Has not"} ${action?.label || rule.value}`;
      default:
        return rule.value;
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {rules.map((rule, index) => (
        <span key={rule.id}>
          <Badge variant="secondary" className="text-xs">
            {getRuleDescription(rule)}
          </Badge>
          {index < rules.length - 1 && (
            <span className="text-xs text-muted-foreground mx-1">
              {matchType === "all" ? "AND" : "OR"}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
