'use client';

// Workshop Control Platform - Main Application
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ExternalLink
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, isLoading, isAuthenticated, logout, isAdmin, isSupervisor } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications] = useState([
    { id: 1, title: 'Emergency job card created', time: '5m ago', type: 'urgent' },
    { id: 2, title: 'Material request pending approval', time: '1h ago', type: 'pending' },
    { id: 3, title: 'Low stock alert: Engine Oil', time: '2h ago', type: 'warning' },
  ]);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                W
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Workshop Control Platform</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Asset & Maintenance Management</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-slate-600" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                      {notifications.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start py-2">
                      <span className="font-medium text-sm">{n.title}</span>
                      <span className="text-xs text-slate-500">{n.time}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center text-emerald-600 font-medium">
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                      <div className="text-left hidden md:block">
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

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col gap-4 mt-6">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Avatar className="h-10 w-10 bg-emerald-100">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 px-1">
                      {user.roles?.map((role) => (
                        <Badge key={role.code} variant="outline" className="text-xs">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="ghost" className="justify-start gap-3">
                      <Settings className="h-5 w-5" />
                      Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 text-red-600"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Navigation Tabs - Desktop */}
          <div className="bg-white border-b px-4 sm:px-6 lg:px-8 hidden sm:block">
            <TabsList className="w-full h-12 bg-transparent p-0 flex justify-start gap-1">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="assets" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <Truck className="h-4 w-4" />
                <span className="text-sm">Assets</span>
              </TabsTrigger>
              <TabsTrigger 
                value="jobcards" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <Wrench className="h-4 w-4" />
                <span className="text-sm">Job Cards</span>
              </TabsTrigger>
              <TabsTrigger 
                value="timelogs" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm">Time Logs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="inventory" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <Package className="h-4 w-4" />
                <span className="text-sm">Inventory</span>
              </TabsTrigger>
              <TabsTrigger 
                value="requests" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">Requests</span>
              </TabsTrigger>
              <TabsTrigger 
                value="issues" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm">Issues</span>
              </TabsTrigger>
              <TabsTrigger 
                value="purchase" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Purchase</span>
              </TabsTrigger>
              <TabsTrigger 
                value="fuel" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <Fuel className="h-4 w-4" />
                <span className="text-sm">Fuel</span>
              </TabsTrigger>
              <TabsTrigger 
                value="external" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">External</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-4"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Reports</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Navigation Tabs - Mobile */}
          <div className="bg-white border-b px-4 sm:hidden overflow-x-auto">
            <TabsList className="w-full h-auto bg-transparent p-2 flex justify-start gap-1 flex-nowrap">
              <TabsTrigger 
                value="dashboard" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-xs">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="assets" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <Truck className="h-4 w-4" />
                <span className="text-xs">Assets</span>
              </TabsTrigger>
              <TabsTrigger 
                value="jobcards" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <Wrench className="h-4 w-4" />
                <span className="text-xs">Jobs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="timelogs" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <Clock className="h-4 w-4" />
                <span className="text-xs">Time</span>
              </TabsTrigger>
              <TabsTrigger 
                value="inventory" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <Package className="h-4 w-4" />
                <span className="text-xs">Inventory</span>
              </TabsTrigger>
              <TabsTrigger 
                value="requests" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Requests</span>
              </TabsTrigger>
              <TabsTrigger 
                value="issues" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs">Issues</span>
              </TabsTrigger>
              <TabsTrigger 
                value="purchase" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">Purchase</span>
              </TabsTrigger>
              <TabsTrigger 
                value="fuel" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <Fuel className="h-4 w-4" />
                <span className="text-xs">Fuel</span>
              </TabsTrigger>
              <TabsTrigger 
                value="external" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-xs">External</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex flex-col items-center gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg px-3 py-2 min-w-[60px]"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Reports</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <DashboardView />
          </TabsContent>

          <TabsContent value="assets" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <AssetsView />
          </TabsContent>

          <TabsContent value="jobcards" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <JobCardsView />
          </TabsContent>

          <TabsContent value="timelogs" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <TimeLogsView />
          </TabsContent>

          <TabsContent value="inventory" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <InventoryView />
          </TabsContent>

          <TabsContent value="requests" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <MaterialRequestsView />
          </TabsContent>

          <TabsContent value="issues" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <MaterialIssuesView />
          </TabsContent>

          <TabsContent value="purchase" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <PurchaseOrdersView />
          </TabsContent>

          <TabsContent value="fuel" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <FuelControlView />
          </TabsContent>

          <TabsContent value="external" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <ExternalRepairsView />
          </TabsContent>

          <TabsContent value="reports" className="flex-1 mt-0 p-4 sm:p-6 lg:p-8">
            <ReportsView />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <div>WCP v2.0 • Workshop Control Platform</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              System Online
            </span>
            <span className="text-slate-400">|</span>
            <span>Logged in as {user.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
