import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    apiKey: "",
  });

  const { data: credentials, isLoading: credLoading, refetch: refetchCreds } = trpc.credentials.get.useQuery();
  const { data: syncLog, isLoading: syncLoading, refetch: refetchSync } = trpc.mywfg.getLatestSync.useQuery();
  const saveMutation = trpc.credentials.save.useMutation();
  const testSyncMutation = trpc.mywfg.testSync.useMutation();
  const manualSyncMutation = trpc.mywfg.manualSync.useMutation();

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error("Username and password are required");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        apiKey: formData.apiKey || undefined,
      });

      toast.success("Credentials saved securely");
      setFormData({ username: "", password: "", apiKey: "" });
      setIsOpen(false);
      refetchCreds();
    } catch (error) {
      toast.error("Failed to save credentials");
    }
  };

  const handleTestSync = async () => {
    try {
      const result = await testSyncMutation.mutateAsync();
      if (result.success) {
        toast.success(`Test sync successful! Extracted ${result.agentsExtracted} agents`);
      } else {
        toast.error(`Test sync failed: ${result.error}`);
      }
      refetchSync();
    } catch (error) {
      toast.error("Failed to run test sync");
    }
  };

  const handleManualSync = async () => {
    try {
      const result = await manualSyncMutation.mutateAsync();
      if (result.success) {
        toast.success(`Sync completed! Processed ${result.agentsProcessed} agents and ${result.productionProcessed} production records`);
      } else {
        toast.error(`Sync failed: ${result.message}`);
      }
      refetchSync();
    } catch (error) {
      toast.error("Failed to run sync");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage system configuration and integrations.</p>
      </div>

      <Tabs defaultValue="mywfg" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mywfg">MyWFG Integration</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        {/* MyWFG Integration Tab */}
        <TabsContent value="mywfg" className="space-y-6">
          {/* Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                MyWFG Credentials
              </CardTitle>
              <CardDescription>
                Securely store your mywfg.com login credentials for automated data syncing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {credLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : credentials ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Credentials are securely stored and encrypted. They are never displayed in plain text.
                    </AlertDescription>
                  </Alert>

                  {credentials.lastUsedAt && (
                    <div className="text-sm text-muted-foreground">
                      Last used: {format(new Date(credentials.lastUsedAt), "MMM d, yyyy h:mm a")}
                    </div>
                  )}

                  <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Update Credentials</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Update MyWFG Credentials</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveCredentials} className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800 text-sm">
                            Your credentials will be encrypted and stored securely. Never shared or displayed in plain text.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <Label htmlFor="username">MyWFG Username</Label>
                          <Input
                            id="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Your MyWFG username"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">MyWFG Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Your MyWFG password"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API Key (Optional)</Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            placeholder="Optional API key if available"
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? "Saving..." : "Save Credentials"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      No credentials stored yet. Add your MyWFG login to enable automated syncing.
                    </AlertDescription>
                  </Alert>

                  <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                      <Button>Add MyWFG Credentials</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add MyWFG Credentials</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveCredentials} className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800 text-sm">
                            Your credentials will be encrypted and stored securely. Never shared or displayed in plain text.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <Label htmlFor="username">MyWFG Username</Label>
                          <Input
                            id="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Your MyWFG username"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">MyWFG Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Your MyWFG password"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API Key (Optional)</Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            placeholder="Optional API key if available"
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? "Saving..." : "Save Credentials"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sync Status
              </CardTitle>
              <CardDescription>Monitor and control MyWFG data synchronization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncLoading ? (
                <p className="text-muted-foreground">Loading sync status...</p>
              ) : syncLog ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Last Sync</p>
                      <p className="font-medium">{format(new Date(syncLog.syncDate), "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className={`font-medium ${syncLog.status === "SUCCESS" ? "text-green-600" : "text-red-600"}`}>
                        {syncLog.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Records Processed</p>
                      <p className="font-medium">{syncLog.recordsProcessed || 0}</p>
                    </div>
                    {syncLog.errorMessage && (
                      <div>
                        <p className="text-sm text-muted-foreground">Error</p>
                        <p className="font-medium text-red-600 text-sm">{syncLog.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No sync history yet.</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleTestSync}
                  variant="outline"
                  disabled={testSyncMutation.isPending || !credentials}
                >
                  {testSyncMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button onClick={handleManualSync} disabled={manualSyncMutation.isPending || !credentials}>
                  {manualSyncMutation.isPending ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>System-wide configuration options.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">More settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
