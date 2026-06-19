import React from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart2, Building2, CreditCard, FileText, Home, Layers, Settings, Users } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const superAdminMenu = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/super-admin/customers', label: 'Customers', icon: Users },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/super-admin/customers', label: 'Properties', icon: Building2 },
  { to: '/super-admin/customers', label: 'Units', icon: Layers },
  { to: '/super-admin/customers', label: 'Tenants', icon: Users },
  { to: '/super-admin/system-monitor', label: 'System Monitor', icon: BarChart2 },
  { to: '/super-admin/activity-logs', label: 'Activity Logs', icon: FileText },
  { to: '/super-admin/reports', label: 'Reports', icon: BarChart2 },
  { to: '/super-admin/settings', label: 'Settings', icon: Settings },
];

const pageMeta = {
  '/super-admin/dashboard': ['Super Admin Dashboard', 'Overview of your platform performance and system health'],
  '/super-admin/customers': ['Customers', 'Manage customer accounts'],
  '/super-admin/subscriptions': ['Subscriptions', 'Subscription plans and status'],
  '/super-admin/system-monitor': ['System Monitor', 'Platform health and service status'],
  '/super-admin/activity-logs': ['Activity Logs', 'Review recent platform activity'],
  '/super-admin/reports': ['Reports', 'Revenue and growth analytics'],
  '/super-admin/settings': ['Settings', 'Manage platform configuration']
};

const SuperAdminLayout = ({ children }) => {
  const location = useLocation();
  const [pageTitle, pageSubtitle] = pageMeta[location.pathname] || ['Super Admin', 'Manage the platform'];

  return (
    <ResponsiveShell
      brand="RentSaaS"
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
