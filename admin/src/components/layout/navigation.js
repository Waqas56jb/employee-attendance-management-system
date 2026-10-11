import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  Clock,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings2,
  Users,
  Wallet,
} from 'lucide-react';

/** Sidebar structure. `match` lists path prefixes that mark the item active. */
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'Workforce',
    items: [
      { to: '/employees', label: 'Employees', icon: Users },
      { to: '/customers', label: 'Customers', icon: Building2 },
      { to: '/projects', label: 'Projects', icon: Briefcase },
      { to: '/attendance', label: 'Attendance', icon: Clock, badgeKey: 'attendance' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/billing', label: 'Billing & Hourly Rates', icon: Wallet },
      { to: '/invoices', label: 'Invoices', icon: Receipt, badgeKey: 'invoices' },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
      { to: '/settings/business', label: 'Business Settings', icon: Settings2 },
      { to: '/settings/invoices', label: 'Invoice Settings', icon: FileText },
      { to: '/settings/working-hours', label: 'Working Hours Settings', icon: CalendarClock },
    ],
  },
];
