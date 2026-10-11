import { Bell, Building2, CalendarDays, Clock, FolderKanban, LayoutDashboard, Settings, User } from 'lucide-react';

/** Employee navigation. There are intentionally no administrator destinations here. */
export const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/check-in-out', label: 'Check In / Check Out', shortLabel: 'Check In', icon: Clock },
      { to: '/attendance', label: 'My Attendance', shortLabel: 'Attendance', icon: CalendarDays },
    ],
  },
  {
    label: 'Assignments',
    items: [
      { to: '/projects', label: 'My Projects', shortLabel: 'Projects', icon: FolderKanban },
      { to: '/customers', label: 'My Customers', shortLabel: 'Customers', icon: Building2 },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
