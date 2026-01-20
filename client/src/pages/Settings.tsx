import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, AlertCircle, CheckCircle2, RefreshCw, Clock, CalendarClock, Activity, Users, Download } from "lucide-react";
import { useLocation } from "wouter";
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
  const downlineSyncMutation = trpc.mywfg.syncDownlineStatus.useMutation();
  const [downlineSyncResult, setDownlineSyncResult] = useState<{
    success: boolean;
    agentsFetched: number;
    agentsAdded: number;
    agentsUpdated: number;
    agentsDeactivated: number;
    agentsReactivated: number;
    error?: string;
  } | null>(null);
  
  const contactSyncMutation = trpc.mywfg.syncContactInfo.useMutation();
  const [contactSyncResult, setContactSyncResult] = useState<{
    success: boolean;
    agentsUpdated: number;
    error?: string;
  } | null>(null);

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
      const result = await testSyncMutation.mutateAsync({});
      if (result.success) {
        toast.success(`Test sync successful! Extracted ${result.agentsExtracted} agents`);
      } else if (result.requiresValidation) {
        toast.info("Validation code required. Please check your email for the code.");
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
      const result = await manualSyncMutation.mutateAsync({});
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

  const handleDownlineSync = async () => {
    setDownlineSyncResult(null);
    try {
      toast.info("Starting Downline Status sync... This may take a few minutes.");
      const result = await downlineSyncMutation.mutateAsync();
      setDownlineSyncResult(result);
      if (result.success) {
        toast.success(`Downline sync completed! Fetched ${result.agentsFetched} agents, Added ${result.agentsAdded}, Updated ${result.agentsUpdated}`);
      } else {
        toast.error(`Downline sync failed: ${result.error}`);
      }
      refetchSync();
    } catch (error) {
      toast.error("Failed to run Downline Status sync");
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

              {/* Automatic Sync Schedule */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Automatic Sync Schedule</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>3:30 PM EST</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>6:30 PM EST</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Data syncs automatically twice daily. Check Sync History for detailed logs.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => window.location.href = '/sync-history'}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                View Sync History
              </Button>
            </CardContent>
          </Card>

          {/* Downline Status Sync Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Downline Status Sync
              </CardTitle>
              <CardDescription>
                Fetch fresh agent data from MyWFG Downline Status report with filters: Type=Active, Team=SMD Base, Title Level=TA/A/SA/MD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Download className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  This will fetch the latest active agents from MyWFG and update the database. The Active Associates count on the dashboard will reflect the current data.
                </AlertDescription>
              </Alert>

              {downlineSyncResult && (
                <div className={`p-3 rounded-lg ${downlineSyncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {downlineSyncResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${downlineSyncResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {downlineSyncResult.success ? 'Sync Completed' : 'Sync Failed'}
                    </span>
                  </div>
                  {downlineSyncResult.success ? (
                    <div className="grid grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Fetched</p>
                        <p className="font-medium text-green-700">{downlineSyncResult.agentsFetched}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Added</p>
                        <p className="font-medium text-green-700">{downlineSyncResult.agentsAdded}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Updated</p>
                        <p className="font-medium text-green-700">{downlineSyncResult.agentsUpdated}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Deactivated</p>
                        <p className="font-medium text-orange-600">{downlineSyncResult.agentsDeactivated || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Reactivated</p>
                        <p className="font-medium text-blue-600">{downlineSyncResult.agentsReactivated || 0}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{downlineSyncResult.error}</p>
                  )}
                </div>
              )}

              <Button
                onClick={handleDownlineSync}
                disabled={downlineSyncMutation.isPending}
                className="gap-2"
              >
                {downlineSyncMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Sync Downline Status
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Contact Info Sync Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contact Info Sync
              </CardTitle>
              <CardDescription>
                Fetch phone numbers, emails, and addresses from MyWFG Associate Details for agents with missing contact info.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-purple-50 border-purple-200">
                <Download className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800 text-sm">
                  This will fetch contact information from the Hierarchy Tool Associate Details page for all agents with missing phone numbers. Processes in batches of 15 with session refresh.
                </AlertDescription>
              </Alert>

              {contactSyncResult && (
                <div className={`p-3 rounded-lg ${contactSyncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {contactSyncResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${contactSyncResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {contactSyncResult.success ? 'Sync Completed' : 'Sync Failed'}
                    </span>
                  </div>
                  {contactSyncResult.success ? (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Agents Updated</p>
                      <p className="font-medium text-green-700">{contactSyncResult.agentsUpdated}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{contactSyncResult.error}</p>
                  )}
                </div>
              )}

              <Button
                onClick={async () => {
                  setContactSyncResult(null);
                  toast.info("Starting contact info sync... This may take several minutes.");
                  try {
                    const result = await contactSyncMutation.mutateAsync();
                    setContactSyncResult(result);
                    if (result.success) {
                      toast.success(`Contact sync complete! Updated ${result.agentsUpdated} agents.`);
                    } else {
                      toast.error(result.error || "Contact sync failed");
                    }
                  } catch (error) {
                    toast.error("Contact sync failed");
                    setContactSyncResult({ success: false, agentsUpdated: 0, error: String(error) });
                  }
                }}
                disabled={contactSyncMutation.isPending}
                className="gap-2"
                variant="outline"
              >
                {contactSyncMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing Contact Info...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Sync Contact Info
                  </>
                )}
              </Button>
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
