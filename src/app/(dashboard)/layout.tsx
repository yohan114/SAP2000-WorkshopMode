'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  User,
  LayoutDashboard,
  Wrench,
  Package,
  Loader2,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from '@/components/wcp/notification-bell';
import { SidebarNav } from '@/components/navigation/sidebar-nav';
import { CommandPalette } from '@/components/navigation/command-palette';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { findNavContext } from '@/components/navigation/navigation-data';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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

  const isAdminUser = isAdmin();

  // Get current page title
  const { item: currentNavItem } = findNavContext(pathname);
  const pageTitle = currentNavItem?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Command Palette */}
      <CommandPalette isAdminUser={isAdminUser} open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 224 : 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-gradient-to-b from-card to-slate-50/50 border-r h-screen sticky top-0 relative overflow-hidden"
      >
        {/* Logo Section */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              W
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <Link href="/dashboard" className="block">
                  <h1 className="text-lg font-bold text-slate-900 truncate">WCP</h1>
                  <p className="text-xs text-slate-500 truncate">Workshop Control</p>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Search Trigger */}
        {sidebarOpen ? (
          <div className="px-3 pt-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-50 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors border border-slate-100"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border rounded">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </button>
          </div>
        ) : (
          <div className="px-2 pt-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <SidebarNav
          sidebarOpen={sidebarOpen}
          isAdminUser={isAdminUser}
          onNavigate={() => {}}
        />

        {/* User Section at Bottom */}
        <div className="p-3 border-t">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-slate-50",
            !sidebarOpen && "justify-center"
          )}>
            <Avatar className="h-8 w-8 bg-emerald-100 flex-shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-700 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 truncate">{user.roles?.[0]?.name || 'User'}</div>
              </div>
            )}
          </div>
        </div>

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
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-card border-r transform transition-transform duration-300 md:hidden flex flex-col",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Logo Section */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              W
            </div>
            <div className="min-w-0">
              <Link href="/dashboard" className="block">
                <h1 className="text-lg font-bold text-slate-900 truncate">WCP</h1>
                <p className="text-xs text-slate-500 truncate">Workshop Control</p>
              </Link>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 rounded-md hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              setCommandOpen(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-50 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors border border-slate-100"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search...</span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <SidebarNav
          sidebarOpen={true}
          isAdminUser={isAdminUser}
          onNavigate={() => setMobileSidebarOpen(false)}
        />

        {/* Mobile User Section */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
            <Avatar className="h-8 w-8 bg-emerald-100 flex-shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-700 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 truncate">{user.roles?.[0]?.name || 'User'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-card border-b sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left side - Mobile menu, Breadcrumbs & Title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden p-2 rounded-md hover:bg-slate-100"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Page Title & Breadcrumbs */}
                <div className="flex flex-col">
                  <div className="hidden sm:block mb-0.5">
                    <Breadcrumbs />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{pageTitle}</h2>
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
                            {isAdminUser && <Shield className="h-3 w-3 text-emerald-600" />}
                          </div>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-slate-400 rotate-[-90deg]" />
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
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-card border-t py-3 px-4 sm:px-6 hidden md:block">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <div>WCP v2.0 - Workshop Control Platform</div>
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

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-card/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[1.5rem] z-50 flex items-center justify-between px-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <Link href="/dashboard" className={cn(
            "p-3 rounded-[1rem] transition-all duration-300 active:scale-95",
            pathname === '/dashboard' ? "bg-primary/20 text-primary shadow-inner" : "text-muted-foreground hover:text-foreground"
          )}>
            <LayoutDashboard className="w-6 h-6" />
          </Link>
          <Link href="/job-cards" className={cn(
            "p-3 rounded-[1rem] transition-all duration-300 active:scale-95",
            pathname === '/job-cards' ? "bg-primary/20 text-primary shadow-inner" : "text-muted-foreground hover:text-foreground"
          )}>
            <Wrench className="w-6 h-6" />
          </Link>
          <Link href="/inventory" className={cn(
            "p-3 rounded-[1rem] transition-all duration-300 active:scale-95",
            pathname === '/inventory' ? "bg-primary/20 text-primary shadow-inner" : "text-muted-foreground hover:text-foreground"
          )}>
            <Package className="w-6 h-6" />
          </Link>
          <button onClick={() => setMobileSidebarOpen(true)} className="p-3 rounded-[1rem] transition-all duration-300 active:scale-95 text-muted-foreground hover:text-foreground">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
