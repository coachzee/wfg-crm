import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Users, CheckCircle, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">WFG Agent CRM</h1>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Manage Your Insurance Agency Team
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              A proprietary CRM system designed for WFG brokers to track agent recruitment,
              training, licensing, and client relationships.
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 border rounded-lg">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Agent Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track recruits through 8 workflow stages from recruitment to chargeback proof.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Follow-up Management</h3>
              <p className="text-sm text-muted-foreground">
                Automated reminders and task tracking integrated into every workflow stage.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <BarChart3 className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Analytics & Dashboards</h3>
              <p className="text-sm text-muted-foreground">
                Real-time visibility into team performance and production milestones.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <Shield className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">
                In-house hosted system with encrypted credential storage for mywfg.com integration.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>WFG Agent and Client CRM. Proprietary system for authorized use only.</p>
        </div>
      </footer>
    </div>
  );
}
