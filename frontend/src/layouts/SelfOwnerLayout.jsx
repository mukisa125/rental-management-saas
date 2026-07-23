import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, Building2, CreditCard, FileText, Home, ReceiptText, Settings, Users, Wrench } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const selfOwnerMenu = [
  { to: '/self-owner/dashboard', label: 'Dashboard', icon: Home },
  { to: '/self-owner/properties', label: 'Properties', icon: Building2 },
  { to: '/self-owner/units', label: 'Units', icon: Building2 },
  { to: '/self-owner/tenants', label: 'Tenants', icon: Users },
  { to: '/self-owner/payments', label: 'Payments', icon: CreditCard },
  { to: '/self-owner/invoices', label: 'Rent & Invoices', icon: ReceiptText },
  { to: '/self-owner/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/self-owner/reports', label: 'Reports', icon: BarChart3 },
  { to: '/self-owner/documents', label: 'Documents', icon: FileText },
  { to: '/self-owner/notices', label: 'Notices', icon: Bell },
  { to: '/self-owner/settings', label: 'Settings', icon: Settings },
];

const pageMeta = {
  '/self-owner/dashboard': ['Self Owner Dashboard', 'Manage your properties, tenants, rent, and maintenance'],
  '/self-owner/properties': ['Properties', 'Manage your property portfolio, occupancy, and marketplace visibility'],
  '/self-owner/units': ['Units', 'Track availability, rent, tenants, and unit applications'],
  '/self-owner/tenants': ['Tenants', 'Manage tenant profiles, leases, balances, and onboarding'],
  '/self-owner/payments': ['Payments', 'Track rent collections, balances, and payment history'],
  '/self-owner/invoices': ['Rent & Invoices', 'Generate invoices and monitor rent billing'],
  '/self-owner/maintenance': ['Maintenance', 'Review requests, approvals, assignments, and completions'],
  '/self-owner/reports': ['Reports', 'Analyze occupancy, revenue, payments, and operations'],
  '/self-owner/documents': ['Documents', 'Organize lease, tenant, payment, and maintenance files'],
  '/self-owner/notices': ['Notices', 'Send and manage tenant communications'],
  '/self-owner/settings': ['Settings', 'Configure your business, receipts, payments, and preferences'],
  '/self-owner/profile': ['Profile', 'Review and update your account details'],
};

const SelfOwnerLayout = ({ children }) => {
  const location = useLocation();
  const [pageTitle, pageSubtitle] = pageMeta[location.pathname] || ['RentProLink', 'Manage your rental operations'];

  return (
    <ResponsiveShell
      brand="RentProLink"
      roleLabel="Landlord"
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      menuItems={selfOwnerMenu}
      theme="light"
    >
      {children || <Outlet />}
    </ResponsiveShell>
  );
};

export default SelfOwnerLayout;
