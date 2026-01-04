import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, Calendar, FileText, User } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = id ? parseInt(id) : 0;

  const { data: client, isLoading } = trpc.clients.getById.useQuery(clientId, {
    enabled: clientId > 0,
  });

  const { data: agent } = trpc.agents.getById.useQuery(client?.agentId || 0, {
    enabled: !!client?.agentId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/clients")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Client not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/clients")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            {agent && (
              <p className="text-muted-foreground mt-1">
                Agent: {agent.firstName} {agent.lastName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {client.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline">
                    {client.email}
                  </a>
                </div>
              </div>
            )}

            {client.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <a href={`tel:${client.phone}`} className="text-sm text-blue-600 hover:underline">
                    {client.phone}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Added</p>
                <p className="text-sm">{format(new Date(client.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>

            {client.renewalDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Next Renewal</p>
                  <p className="text-sm">{format(new Date(client.renewalDate), "MMM d, yyyy")}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="h-4 w-4" />
            Policies
          </TabsTrigger>
        </TabsList>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{client.notes}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No notes added yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Policy Information</p>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Policy tracking feature coming soon</p>
                    <p>You'll be able to track multiple policies per client with renewal dates and policy details</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Information */}
      {agent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Assigned Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{agent.firstName} {agent.lastName}</p>
                {agent.agentCode && (
                  <p className="text-sm text-muted-foreground">Code: {agent.agentCode}</p>
                )}
              </div>
              <Button variant="outline" onClick={() => navigate(`/agents/${agent.id}`)}>
                View Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
