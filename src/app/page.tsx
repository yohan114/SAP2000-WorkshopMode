'use client';

// Workshop Control Platform - Main Application
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Truck, 
  Wrench, 
  Package, 
  FileText,
  Clock,
  ShoppingCart,
  BarChart3,
  Bell,
  User,
  Menu,
  Settings,
  LogOut,
  ClipboardList,
  ChevronDown,
  Shield,
  Loader2,
  Fuel,
  ExternalLink,
  GraduationCap,
  Gauge,
  CalendarCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  PackageCheck,
  ClipboardCheck,
  Scale,
  FileCheck,
  FolderOpen,
  ShieldCheck,
  BellRing,
  Webhook
} from 'lucide-react';
import { DashboardView } from '@/components/wcp/dashboard-view';
import { AssetsView } from '@/components/wcp/assets-view';
import { JobCardsView } from '@/components/wcp/job-cards-view';
import { InventoryView } from '@/components/wcp/inventory-view';
import { MaterialRequestsView } from '@/components/wcp/material-requests-view';
import { TimeLogsView } from '@/components/wcp/time-logs-view';
import { MaterialIssuesView } from '@/components/wcp/material-issues-view';
import { PurchaseOrdersView } from '@/components/wcp/purchase-orders-view';
import { ReportsView } from '@/components/wcp/reports-view';
import { FuelControlView } from '@/components/wcp/fuel-control-view';
import { ExternalRepairsView } from '@/components/wcp/external-repairs-view';
import { LabourTrainingView } from '@/components/wcp/labour-training-view';
import { KpiSlaView } from '@/components/wcp/kpi-sla-view';
import { PmView } from '@/components/wcp/pm-view';
import { EmployeesView } from '@/components/wcp/employees-view';
import { GrnView } from '@/components/wcp/grn-view';
import { StockTakeView } from '@/components/wcp/stock-take-view';
import { QuotationComparisonView } from '@/components/wcp/quotation-comparison-view';
import { InvoiceMatchingView } from '@/components/wcp/invoice-matching-view';
import { DocumentsView } from '@/components/wcp/documents-view';
import { QualityView } from '@/components/wcp/quality-view';
import { NotificationsView } from '@/components/wcp/notifications-view';
import { AuditView } from '@/components/wcp/audit-view';
import { WebhooksView } from '@/components/wcp/webhooks-view';
import { NotificationBell } from '@/components/wcp/notification-bell';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assets', label: 'Assets', icon: Truck },
  { id: 'jobcards', label: 'Job Cards', icon: Wrench },
  { id: 'timelogs', label: 'Time Logs', icon: Clock },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'issues', label: 'Issues', icon: ClipboardList },
  { id: 'purchase', label: 'Purchase', icon: ShoppingCart },
  { id: 'grn', label: 'GRN', icon: PackageCheck },
  { id: 'quotations', label: 'Quotations', icon: Scale },
  { id: 'invoices', label: 'Invoices', icon: FileCheck },
  { id: 'stocktake', label: 'Stock Take', icon: ClipboardCheck },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'fuel', label: 'Fuel', icon: Fuel },
  { id: 'external', label: 'External', icon: ExternalLink },
  { id: 'labour', label: 'Training', icon: GraduationCap },
  { id: 'pm', label: 'PM', icon: CalendarCheck },
  { id: 'quality', label: 'Quality', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: BellRing },
  { id: 'kpi', label: 'KPIs', icon: Gauge },
  { id: 'audit', label: 'Audit', icon: Shield },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

// Sidebar component defined outside to avoid React hooks warning
interface SidebarContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  user: {
    name: string;
    roles?: Array<{ name: string; code: string }>;
  };
  userInitials: string;
}

function SidebarContent({ 
  activeTab, 
  setActiveTab, 
  sidebarOpen, 
  mobileSidebarOpen, 
  setMobileSidebarOpen,
  user,
  userInitials 
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
            W
          </div>
          {(sidebarOpen || mobileSidebarOpen) && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">WCP</h1>
              <p className="text-xs text-slate-500 truncate">Workshop Control</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                isActive 
                  ? "bg-emerald-50 text-emerald-700 font-medium" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-emerald-600" : "text-slate-400")} />
              {(sidebarOpen || mobileSidebarOpen) && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section at Bottom */}
      <div className="p-3 border-t">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg bg-slate-50",
          !sidebarOpen && !mobileSidebarOpen && "justify-center"
        )}>
          <Avatar className="h-8 w-8 bg-emerald-100 flex-shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {(sidebarOpen || mobileSidebarOpen) && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-700 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 truncate">{user.roles?.[0]?.name || 'User'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isLoading, isAuthenticated, logout, isAdmin, isSupervisor } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const userInitials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'assets': return <AssetsView />;
      case 'jobcards': return <JobCardsView />;
      case 'timelogs': return <TimeLogsView />;
      case 'employees': return <EmployeesView />;
      case 'inventory': return <InventoryView />;
      case 'requests': return <MaterialRequestsView />;
      case 'issues': return <MaterialIssuesView />;
      case 'purchase': return <PurchaseOrdersView />;
      case 'grn': return <GrnView />;
      case 'quotations': return <QuotationComparisonView />;
      case 'invoices': return <InvoiceMatchingView />;
      case 'stocktake': return <StockTakeView />;
      case 'documents': return <DocumentsView />;
      case 'fuel': return <FuelControlView />;
      case 'external': return <ExternalRepairsView />;
      case 'labour': return <LabourTrainingView />;
      case 'pm': return <PmView />;
      case 'quality': return <QualityView />;
      case 'notifications': return <NotificationsView />;
      case 'kpi': return <KpiSlaView />;
      case 'audit': return <AuditView />;
      case 'webhooks': return <WebhooksView />;
      case 'reports': return <ReportsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-white border-r transition-all duration-300 h-screen sticky top-0 relative",
          sidebarOpen ? "w-56" : "w-16"
        )}
      >
        <SidebarContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          mobileSidebarOpen={false}
          setMobileSidebarOpen={setMobileSidebarOpen}
          user={user}
          userInitials={userInitials}
        />
        
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors z-10"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-white border-r transform transition-transform duration-300 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={true}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          user={user}
          userInitials={userInitials}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left side - Mobile menu & Title */}
              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {/* Page Title */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {navigationItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  </h2>
                </div>
              </div>

              {/* Right side - Notifications & User Menu */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Notifications */}
                <NotificationBell />

                {/* User Menu - Desktop */}
                <div className="hidden sm:flex items-center gap-3 pl-3 border-l">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 px-2">
                        <Avatar className="h-8 w-8 bg-emerald-100">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left hidden lg:block">
                          <div className="text-sm font-medium text-slate-700">{user.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            {user.roles?.[0]?.name || 'User'}
                            {isAdmin() && <Shield className="h-3 w-3 text-emerald-600" />}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs font-normal text-slate-500">{user.email}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-medium text-slate-500 mb-1">Roles</p>
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((role) => (
                            <Badge key={role.code} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="sm:hidden">
                      <Avatar className="h-8 w-8 bg-emerald-100">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs font-normal text-slate-500">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t py-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <div>WCP v2.0 • Workshop Control Platform</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                System Online
              </span>
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="hidden sm:inline">Logged in as {user.name}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
