import { Outlet } from 'react-router-dom';
import { DollarSign, FileText, Home, LayoutDashboard, Settings, Wrench } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const tenantMenu = [
  { to: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenant/property', label: 'My Property', icon: Home },
  { to: '/tenant/payments', label: 'Payments', icon: DollarSign },
  { to: '/tenant/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/tenant/documents', label: 'Documents', icon: FileText },
  { to: '/tenant/settings', label: 'Settings', icon: Settings },
];

const TenantLayout = ({ children }) => (
  <ResponsiveShell
    brand="Rental SaaS"
    roleLabel="Tenant"
    pageTitle="Tenant Portal"
    menuItems={tenantMenu}
    theme="light"
  >
    {children || <Outlet />}
  </ResponsiveShell>
);

export default TenantLayout;
