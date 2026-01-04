import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Clients from "./pages/Clients";
import Production from "./pages/Production";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import NotificationSettings from "./pages/NotificationSettings";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/agents"}>
        {() => (
          <DashboardLayout>
            <Agents />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/agents/:id"}>
        {() => (
          <DashboardLayout>
            <AgentDetail />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/clients"}>
        {() => (
          <DashboardLayout>
            <Clients />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/production"}>
        {() => (
          <DashboardLayout>
            <Production />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/tasks"}>
        {() => (
          <DashboardLayout>
            <Tasks />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/settings"}>
        {() => (
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/settings/notifications"}>
        {() => (
          <DashboardLayout>
            <NotificationSettings />
          </DashboardLayout>
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
