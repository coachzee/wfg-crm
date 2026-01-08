import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Mail } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "admin", label: "Admin", description: "Full system access, manage users and settings" },
  { value: "user", label: "Team Member", description: "View and manage agents/clients, create tasks" },
];

export default function TeamMembers() {
  const { data: users, isLoading } = trpc.auth.listUsers.useQuery();
  const { data: currentUser } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground mt-2">
          Manage your team and control who has access to the CRM system.
        </p>
      </div>

      {/* Role Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLES.map((role) => (
          <Card key={role.value}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                {role.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name || user.email}</p>
                      {user.id === currentUser?.id && (
                        <Badge variant="secondary">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>

                  <Badge variant={user.role === "admin" ? "default" : "outline"}>
                    {ROLES.find((r) => r.value === user.role)?.label}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No team members yet</p>
          )}
        </CardContent>
      </Card>

      {/* How to Add Team Members */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How to Add Team Members</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-3">
          <p>
            Team members can access your CRM by logging in with their Manus account. Here's how to set it up:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Have your team member create a Manus account at manus.im</li>
            <li>They can then login to your CRM using their Manus credentials</li>
            <li>Contact support to assign them admin or team member roles</li>
            <li>All team members will see the same real-time data and can collaborate</li>
          </ol>
          <p className="pt-2">
            <strong>Note:</strong> All activity is logged for audit purposes. Team members can view and manage agents, clients, and tasks based on their assigned role.
          </p>
        </CardContent>
      </Card>

      {/* Access Control Info */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-base">Real-time Collaboration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-green-900 space-y-2">
          <p>
            • All team members see the same data in real-time
          </p>
          <p>
            • Changes made by one team member are instantly visible to others
          </p>
          <p>
            • You and your wife can work on the same agents and clients simultaneously
          </p>
          <p>
            • Dashboard metrics update automatically as data changes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
