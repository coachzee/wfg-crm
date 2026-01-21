import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, Users, FileText, 
  CheckCircle, Settings, BarChart3, UserCircle, Shield,
  ChevronRight, Sparkles, ClipboardList, CalendarDays, GraduationCap
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, memo, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// Menu configuration with icons and metadata
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", description: "Overview & analytics" },
  { icon: Users, label: "Agents", path: "/agents", description: "Manage recruits" },
  { icon: FileText, label: "Clients", path: "/clients", description: "Client relationships" },
  { icon: BarChart3, label: "Production", path: "/production", description: "Performance metrics" },
  { icon: ClipboardList, label: "Pending Policies", path: "/pending-policies", description: "Transamerica pending" },
  { icon: CalendarDays, label: "Policy Anniversaries", path: "/anniversaries", description: "Client review reminders" },
  { icon: CheckCircle, label: "Tasks", path: "/tasks", description: "Follow-ups & reminders" },
  { icon: Users, label: "Team", path: "/team", description: "Team members" },
  { icon: GraduationCap, label: "Agent Exam Prep", path: "/exam-prep", description: "License exam status" },
  { icon: Settings, label: "Settings", path: "/settings", description: "System configuration" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// Memoized menu item component
const MenuItem = memo(function MenuItem({ 
  item, 
  isActive, 
  isCollapsed,
  onClick 
}: { 
  item: typeof menuItems[0];
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={onClick}
        tooltip={item.label}
        className={`
          h-11 transition-all duration-200 font-normal group relative
          ${isActive 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'hover:bg-accent/50'
          }
        `}
      >
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-primary/15 text-primary' 
            : 'text-muted-foreground group-hover:text-foreground group-hover:bg-accent'
          }
        `}>
          <item.icon className="h-4 w-4" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col items-start ml-1">
            <span className="text-sm">{item.label}</span>
          </div>
        )}
        {isActive && !isCollapsed && (
          <ChevronRight className="h-4 w-4 ml-auto text-primary/60" />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

// Sign in prompt component
function SignInPrompt() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-subtle">
      <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          <div className="icon-container-lg bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Access to this dashboard requires authentication. Continue to launch the login flow.
          </p>
        </div>
        <Button
          onClick={() => {
            window.location.href = getLoginUrl();
          }}
          size="lg"
          className="w-full shadow-lg hover:shadow-xl transition-all gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Sign in
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return <SignInPrompt />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Memoized navigation callback
  const handleNavigation = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-sidebar"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b border-sidebar-border/50">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img 
                    src="/wbh-logo.jpg" 
                    alt="Wealth Builders Haven" 
                    className="h-12 max-w-[180px] object-contain"
                  />
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-4">
            <SidebarMenu className="space-y-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <MenuItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onClick={() => handleNavigation(item.path)}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent/50 transition-all duration-200 w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border-2 border-primary/20 shrink-0 transition-all duration-200 group-hover:border-primary/40">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.role === 'admin' ? 'Administrator' : 'Team Member'}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 border-b">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => handleNavigation("/settings")}
                  className="cursor-pointer gap-2 mt-1"
                >
                  <UserCircle className="h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-gradient-subtle">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
