import {
  LayoutDashboard,
  Truck,
  Wrench,
  Package,
  FileText,
  Clock,
  ShoppingCart,
  BarChart3,
  BellRing,
  ClipboardList,
  PackageCheck,
  ClipboardCheck,
  Scale,
  FileCheck,
  FolderOpen,
  ShieldCheck,
  Shield,
  Webhook,
  KeyRound,
  UserCog,
  Lock,
  DollarSign,
  Fuel,
  ExternalLink,
  Cog,
  GraduationCap,
  Gauge,
  CalendarCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

export const navigationGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'job-cards', label: 'Job Cards', href: '/job-cards', icon: Wrench },
      { id: 'service-jobs', label: 'Service Jobs', href: '/service-jobs', icon: Cog },
      { id: 'time-logs', label: 'Time Logs', href: '/time-logs', icon: Clock },
      { id: 'external', label: 'External', href: '/external', icon: ExternalLink },
      { id: 'pm', label: 'PM', href: '/pm', icon: CalendarCheck },
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet',
    items: [
      { id: 'assets', label: 'Assets', href: '/assets', icon: Truck },
      { id: 'fuel', label: 'Fuel', href: '/fuel', icon: Fuel },
    ],
  },
  {
    id: 'inventory-supply',
    label: 'Inventory & Supply',
    items: [
      { id: 'inventory', label: 'Inventory', href: '/inventory', icon: Package },
      { id: 'requests', label: 'Requests', href: '/requests', icon: FileText },
      { id: 'issues', label: 'Issues', href: '/issues', icon: ClipboardList },
      { id: 'purchase', label: 'Purchase', href: '/purchase', icon: ShoppingCart },
      { id: 'quotations', label: 'Quotations', href: '/quotations', icon: Scale },
      { id: 'stock-take', label: 'Stock Take', href: '/stock-take', icon: ClipboardCheck },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { id: 'invoices', label: 'Invoices', href: '/invoices', icon: FileCheck },
      { id: 'budget', label: 'Budget', href: '/budget', icon: DollarSign },
      { id: 'reports', label: 'Reports', href: '/reports', icon: BarChart3 },
      { id: 'saved-reports', label: 'Saved Reports', href: '/saved-reports', icon: FileText },
    ],
  },
  {
    id: 'quality-compliance',
    label: 'Quality & Compliance',
    items: [
      { id: 'quality', label: 'Quality', href: '/quality', icon: ShieldCheck },
      { id: 'kpi', label: 'KPIs', href: '/kpi', icon: Gauge },
      { id: 'audit', label: 'Audit', href: '/audit', icon: Shield },
      { id: 'documents', label: 'Documents', href: '/documents', icon: FolderOpen },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { id: 'employees', label: 'Employees', href: '/employees', icon: Users },
      { id: 'labour', label: 'Training', href: '/labour', icon: GraduationCap },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', href: '/notifications', icon: BellRing },
      { id: 'webhooks', label: 'Webhooks', href: '/webhooks', icon: Webhook },
      { id: 'lpa', label: 'LPA', href: '/lpa', icon: DollarSign, adminOnly: true },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    adminOnly: true,
    items: [
      { id: 'users', label: 'Users', href: '/users', icon: UserCog, adminOnly: true },
      { id: 'roles', label: 'Roles', href: '/roles', icon: KeyRound, adminOnly: true },
      { id: 'privileges', label: 'Privileges', href: '/privileges', icon: Lock, adminOnly: true },
    ],
  },
];

// Flat list of all nav items for search/lookup
export function getAllNavItems(): NavItem[] {
  return navigationGroups.flatMap(group => group.items);
}

// Find the group and item for a given pathname
export function findNavContext(pathname: string): { group: NavGroup | null; item: NavItem | null } {
  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return { group, item };
      }
    }
  }
  return { group: null, item: null };
}
