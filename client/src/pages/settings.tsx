import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Settings Content */}
      <Card className="p-12 text-center">
        <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Settings</h3>
        <p className="text-muted-foreground">
          Settings and configuration options will be available here
        </p>
      </Card>
    </div>
  );
}
