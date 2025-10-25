import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Mail, Phone, CreditCard } from "lucide-react";
import type { User, MembershipTier } from "@shared/schema";

export default function MembersPage() {
  const { data: members, isLoading } = useQuery<(User & { membershipTier?: MembershipTier })[]>({
    queryKey: ["/api/members"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
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
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Members
        </h1>
        <p className="text-muted-foreground">Manage facility members</p>
      </div>

      {/* Members List */}
      {!members || members.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No members yet</h3>
          <p className="text-muted-foreground">
            Members will appear here once they sign up
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="p-6 hover-elevate"
              data-testid={`card-member-${member.id}`}
            >
              <div className="flex items-center gap-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={member.profileImageUrl || undefined}
                    style={{ objectFit: "cover" }}
                  />
                  <AvatarFallback className="text-lg">
                    {member.firstName?.[0]}
                    {member.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {member.firstName} {member.lastName}
                    </h3>
                    {member.membershipTier && (
                      <div className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {member.membershipTier.name}
                      </div>
                    )}
                    <div className="px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border capitalize">
                      {member.role?.replace("_", " ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {member.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {member.monthlyCreditsRemaining !== null && (
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="font-mono">
                          {member.monthlyCreditsRemaining}h remaining
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
