import { Outlet, useLocation } from 'react-router-dom';
import { Bell, DollarSign, FileText, Home, LayoutDashboard, Settings, UserRound, Wrench } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const tenantMenu = [
  { to: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenant/my-property', label: 'My Property', icon: Home, aliases: ['/tenant/my-rental'] },
  { to: '/tenant/payments', label: 'Payments', icon: DollarSign },
  { to: '/tenant/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/tenant/documents', label: 'Documents', icon: FileText },
  { to: '/tenant/notices', label: 'Notices', icon: Bell },
  { to: '/tenant/profile', label: 'Profile', icon: UserRound },
  { to: '/tenant/settings', label: 'Settings', icon: Settings },
];

const pageMeta = {
  '/tenant/dashboard': ['Tenant Portal', 'Manage rent, documents, notices, and maintenance requests'],
  '/tenant/my-rental': ['My Rental', 'Review your property, unit, lease, and landlord details'],
  '/tenant/my-property': ['My Property', 'Review your property, unit, lease, and landlord details'],
  '/tenant/payments': ['Payments', 'View payment history, balances, and receipts'],
  '/tenant/maintenance': ['Maintenance', 'Submit and track maintenance requests'],
  '/tenant/documents': ['Documents', 'View lease documents, receipts, and shared files'],
  '/tenant/notices': ['Notices', 'Read messages and updates from your landlord'],
  '/tenant/profile': ['Profile', 'Review and update your account details'],
  '/tenant/settings': ['Settings', 'Manage tenant preferences and account settings'],
};

const TenantLayout = ({ children }) => {
  const location = useLocation();
  const [pageTitle, pageSubtitle] = pageMeta[location.pathname] || ['Tenant Portal', 'Manage your tenancy'];

  return (
    <ResponsiveShell
      brand="RentProLink"
      roleLabel="Tenant"
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      menuItems={tenantMenu}
      searchPlaceholder="Search properties, invoices, requests..."
      theme="light"
    >
      {children || <Outlet />}
    </ResponsiveShell>
  );
};

export default TenantLayout;
