import { useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Home,
  LifeBuoy,
  Search,
  Settings,
  Users,
  UserSearch
} from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const superAdminMenu = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: Home, section: 'Overview' },
  { to: '/super-admin/landlords', label: 'Landlords', icon: Building2, aliases: ['/super-admin/customers'], section: 'Accounts' },
  { to: '/super-admin/tenants', label: 'Tenants', icon: Users, section: 'Accounts' },
  { to: '/super-admin/property-seekers', label: 'Property Seekers', icon: UserSearch, section: 'Accounts' },
  { to: '/super-admin/vacant-listings', label: 'Vacant Listings', icon: Search, section: 'Marketplace' },
  { to: '/super-admin/views-visits', label: 'Views & Visits', icon: Activity, section: 'Marketplace' },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard, section: 'Finance' },
  { to: '/super-admin/billing', label: 'Billing', icon: CreditCard, section: 'Finance' },
  { to: '/super-admin/reports', label: 'Reports', icon: BarChart2, section: 'Finance' },
  { to: '/super-admin/system-monitor', label: 'System Monitor', icon: BarChart2, section: 'Operations' },
  { to: '/super-admin/activity-logs', label: 'Activity Logs', icon: FileText, section: 'Operations' },
  { to: '/super-admin/support-tickets', label: 'Support Tickets', icon: LifeBuoy, section: 'Operations' },
  { to: '/super-admin/announcements', label: 'Announcements', icon: Bell, section: 'Operations' },
  { to: '/super-admin/settings', label: 'Settings', icon: Settings, section: 'Operations' },
];

const pageMeta = {
  '/super-admin/dashboard': ['Super Admin Dashboard', 'Overview of landlords, tenants, property seekers, vacant listings, revenue, and system health.'],
  '/super-admin/landlords': ['Landlords', 'Manage self owners and landlord accounts'],
  '/super-admin/customers': ['Landlords', 'Manage self owners and landlord accounts'],
  '/super-admin/tenants': ['Tenants', 'View and manage tenant records platform-wide'],
  '/super-admin/property-seekers': ['Property Seekers', 'Track seeker profiles, activity, and billing'],
  '/super-admin/vacant-listings': ['Vacant Listings', 'Monitor marketplace inventory and publish status'],
  '/super-admin/views-visits': ['Views & Visits', 'Track billable seeker actions and visits'],
  '/super-admin/subscriptions': ['Subscriptions', 'Landlord subscription plans and statuses'],
  '/super-admin/billing': ['Billing', 'Landlord and marketplace transaction records'],
  '/super-admin/system-monitor': ['System Monitor', 'Platform health and service status'],
  '/super-admin/activity-logs': ['Activity Logs', 'Review recent platform activity'],
  '/super-admin/reports': ['Reports', 'Platform growth, revenue, and marketplace analytics'],
  '/super-admin/support-tickets': ['Support Tickets', 'Support requests across landlords, tenants, and seekers'],
  '/super-admin/announcements': ['Announcements', 'Broadcast platform notices by user group'],
  '/super-admin/settings': ['Settings', 'Manage platform configuration']
};

const SuperAdminLayout = ({ children }) => {
  const location = useLocation();
  const [pageTitle, pageSubtitle] = pageMeta[location.pathname] || ['Super Admin', 'Manage the platform'];

  return (
    <ResponsiveShell
      brand="RentProLink"
      roleLabel="Super Admin"
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      menuItems={superAdminMenu}
      theme="light"
    >
      {children}
    </ResponsiveShell>
  );
};

export default SuperAdminLayout;
