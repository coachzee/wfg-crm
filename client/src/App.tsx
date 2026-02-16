import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";

// Route-level code splitting with React.lazy()
// These components will be loaded on-demand when the route is accessed
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Production = lazy(() => import("./pages/Production"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Settings = lazy(() => import("./pages/Settings"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const Team = lazy(() => import("./pages/Team"));
const SyncHistory = lazy(() => import("./pages/SyncHistory"));
const PendingPolicies = lazy(() => import("./pages/PendingPolicies"));
const PolicyAnniversaries = lazy(() => import("./pages/PolicyAnniversaries"));
const ExamPrep = lazy(() => import("./pages/ExamPrep"));
const QuarterlyReport = lazy(() => import("./pages/QuarterlyReport"));

// Loading fallback component for lazy-loaded routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/agents"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Agents />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/agents/:id"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AgentDetail />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/clients"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Clients />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/clients/:id"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ClientDetail />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/production"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Production />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/pending-policies"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PendingPolicies />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/anniversaries"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PolicyAnniversaries />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/tasks"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Tasks />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/settings"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/settings/notifications"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NotificationSettings />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/team"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Team />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/team/members"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TeamMembers />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/exam-prep"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ExamPrep />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/quarterly-report"}>
        {() => (
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <QuarterlyReport />
            </Suspense>
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/sync-history"}>
        {() => (
          <Suspense fallback={<PageLoader />}>
            <SyncHistory />
          </Suspense>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
