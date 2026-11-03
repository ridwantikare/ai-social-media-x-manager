import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Activity, LayoutDashboard, Settings, Tags, Zap } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/content", label: "Queue", icon: Zap },
  { path: "/keywords", label: "Keywords", icon: Tags },
  { path: "/analytics", label: "Analytics", icon: Activity },
  { path: "/settings", label: "Settings", icon: Settings },
];

function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Zap size={18} className="fill-primary" />
          </div>
          <span className="font-mono text-sm font-bold tracking-widest text-primary">
            NEXUS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-4 gap-2 px-3">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-10 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Link href={item.path} className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { state } = useSidebar();
  return (
    <div className="flex min-h-screen w-full bg-background dark text-foreground">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/50 px-6 backdrop-blur-xl">
          <SidebarTrigger />
          <div className="font-mono text-xs text-muted-foreground">
            {new Date().toISOString().split("T")[0]} // SYSTEM ACTIVE
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
