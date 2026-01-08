import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, BarChart3, Users, CheckCircle, Shield, 
  ArrowRight, Sparkles, TrendingUp, Clock, Target
} from "lucide-react";
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-subtle">
        <div className="text-center animate-fade-in">
          <div className="icon-container-lg bg-primary/10 mx-auto mb-4">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/wbh-logo.jpg" 
              alt="Wealth Builders Haven" 
              className="h-12 object-contain"
            />
          </div>
          <Button asChild className="gap-2 shadow-lg hover:shadow-xl transition-all">
            <a href={getLoginUrl()}>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Proprietary CRM for Insurance Professionals
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
              Build Your <span className="text-gradient">Wealth Building</span> Empire
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A comprehensive CRM system designed for insurance brokers to track agent recruitment,
              training, licensing, production, and client relationships.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <a href={getLoginUrl()}>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { label: "Workflow Stages", value: "8", icon: Target },
              { label: "Real-time Sync", value: "24/7", icon: Clock },
              { label: "Team Visibility", value: "100%", icon: Users },
              { label: "Data Security", value: "AES-256", icon: Shield },
            ].map((stat, index) => (
              <Card key={index} className="card-hover text-center">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Features Grid */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            <Card className="card-hover group">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Agent Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track recruits through 8 workflow stages from recruitment to chargeback proof with automated stage transitions.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover group">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-2">Follow-up Management</h3>
                <p className="text-sm text-muted-foreground">
                  Automated reminders and task tracking integrated into every workflow stage to keep your team accountable.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover group">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="font-semibold mb-2">Analytics & Dashboards</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time visibility into team performance, production milestones, and pipeline conversion rates.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover group">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  In-house hosted system with encrypted credential storage for secure MyWBH integration.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-12">
                <h3 className="text-2xl font-bold mb-4">Ready to Scale Your Team?</h3>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                  Join the Wealth Builders Haven CRM and take control of your insurance agency's growth with powerful tracking and analytics.
                </p>
                <Button size="lg" asChild className="gap-2 shadow-lg hover:shadow-xl transition-all">
                  <a href={getLoginUrl()}>
                    Start Building Today
                    <Sparkles className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="/wbh-logo.jpg" 
              alt="Wealth Builders Haven" 
              className="h-8 object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Proprietary system for authorized use only. © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
