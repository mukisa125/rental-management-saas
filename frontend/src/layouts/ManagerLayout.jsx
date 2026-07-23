import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, Building2, CreditCard, FileText, Home, ReceiptText, Settings, Users, Wrench } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const managerMenu = [
  { to: '/manager/dashboard', label: 'Dashboard', icon: Home },
  { to: '/manager/properties', label: 'Properties', icon: Building2 },
  { to: '/manager/units', label: 'Units', icon: Building2 },
  { to: '/manager/tenants', label: 'Tenants', icon: Users },
  { to: '/manager/payments', label: 'Payments', icon: CreditCard },
  { to: '/manager/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/manager/reports', label: 'Reports', icon: BarChart3 },
  { to: '/manager/documents', label: 'Documents', icon: FileText },
  { to: '/manager/profile', label: 'Settings', icon: Settings },
];

const pageMeta = {
  '/manager/dashboard': ['Manager Dashboard', 'Manage assigned properties, tenants, rent, and maintenance'],
  '/manager/properties': ['Properties', 'Review assigned properties and unit performance'],
  '/manager/units': ['Units', 'Track availability, rent, tenants, and unit applications'],
  '/manager/tenants': ['Tenants', 'Manage tenant profiles, leases, balances, and onboarding'],
  '/manager/payments': ['Payments', 'Track rent collections, balances, and payment history'],
  '/manager/maintenance': ['Maintenance', 'Review requests, approvals, assignments, and completions'],
  '/manager/reports': ['Reports', 'Analyze occupancy, revenue, payments, and operations'],
  '/manager/documents': ['Documents', 'Organize lease, tenant, payment, and maintenance files'],
  '/manager/profile': ['Settings', 'Review and update account details'],
};

const ManagerLayout = ({ children }) => {
  const location = useLocation();
  const [pageTitle, pageSubtitle] = pageMeta[location.pathname] || ['Manager', 'Manage assigned rental operations'];

  return (
    <ResponsiveShell
      brand="RentProLink"
      roleLabel="Manager"
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      menuItems={managerMenu}
      theme="light"
    >
      {children || <Outlet />}
    </ResponsiveShell>
  );
};

export default ManagerLayout;
