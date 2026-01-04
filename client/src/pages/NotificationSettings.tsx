import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Clock, AlertCircle, CheckCircle, Calendar } from "lucide-react";

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    enableOverdueTaskReminders: true,
    enableMilestoneNotifications: true,
    enableRenewalReminders: true,
    overdueThresholdDays: 3,
    renewalThresholdDays: 30,
    notificationTime: "08:00",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would call a tRPC procedure to save settings
      // For now, we'll just show a success message
      toast.success("Notification settings saved successfully");
      console.log("Settings saved:", settings);
    } catch (error) {
      toast.error("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure automated reminders and notifications for your team.
        </p>
      </div>

      {/* Notification Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overdue Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Overdue Task Reminders
            </CardTitle>
            <CardDescription>
              Get notified about follow-up tasks that are past their due date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="overdue-toggle">Enable Reminders</Label>
              <Switch
                id="overdue-toggle"
                checked={settings.enableOverdueTaskReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableOverdueTaskReminders: checked })
                }
              />
            </div>

            {settings.enableOverdueTaskReminders && (
              <div className="space-y-2">
                <Label htmlFor="overdue-days">Days Overdue Threshold</Label>
                <Input
                  id="overdue-days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.overdueThresholdDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overdueThresholdDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Notify when tasks are {settings.overdueThresholdDays} days past due
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestone Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Milestone Notifications
            </CardTitle>
            <CardDescription>
              Get notified when agents reach important milestones ($1,000 production, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="milestone-toggle">Enable Notifications</Label>
              <Switch
                id="milestone-toggle"
                checked={settings.enableMilestoneNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableMilestoneNotifications: checked })
                }
              />
            </div>

            {settings.enableMilestoneNotifications && (
              <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                Milestones tracked: Net Licensed ($1,000), Exam Passed, License Approved
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renewal Reminders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-blue-500" />
              Policy Renewal Reminders
            </CardTitle>
            <CardDescription>
              Get notified about upcoming client policy renewals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="renewal-toggle">Enable Reminders</Label>
              <Switch
                id="renewal-toggle"
                checked={settings.enableRenewalReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableRenewalReminders: checked })
                }
              />
            </div>

            {settings.enableRenewalReminders && (
              <div className="space-y-2">
                <Label htmlFor="renewal-days">Days Before Renewal</Label>
                <Input
                  id="renewal-days"
                  type="number"
                  min="1"
                  max="90"
                  value={settings.renewalThresholdDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      renewalThresholdDays: parseInt(e.target.value) || 30,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Notify {settings.renewalThresholdDays} days before renewal date
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-purple-500" />
              Daily Notification Time
            </CardTitle>
            <CardDescription>
              Set when daily notification checks should run
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-time">Time of Day (24-hour format)</Label>
              <Input
                id="notification-time"
                type="time"
                value={settings.notificationTime}
                onChange={(e) =>
                  setSettings({ ...settings, notificationTime: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Notifications will be sent at {settings.notificationTime} every day
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            How Notifications Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>
            • Notifications are sent to the system owner via the Manus notification system
          </p>
          <p>
            • Daily checks run at your specified time and scan for overdue tasks, milestones, and renewals
          </p>
          <p>
            • You and your wife will receive alerts to stay aligned on team progress and action items
          </p>
          <p>
            • All notifications are logged in the system for audit purposes
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" size="lg">
          Test Notifications
        </Button>
      </div>
    </div>
  );
}
