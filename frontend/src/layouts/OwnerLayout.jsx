import { Outlet } from 'react-router-dom';
import { BarChart3, Building2, DollarSign, LayoutDashboard, Settings, Wrench } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const ownerMenu = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/properties', label: 'Properties', icon: Building2 },
  { to: '/owner/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/owner/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/owner/reports', label: 'Reports', icon: BarChart3 },
  { to: '/owner/settings', label: 'Settings', icon: Settings },
];

const OwnerLayout = ({ children }) => (
  <ResponsiveShell
    brand="Rental SaaS"
    roleLabel="Property Owner"
    pageTitle="Owner Portal"
    menuItems={ownerMenu}
    theme="light"
  >
    {children || <Outlet />}
  </ResponsiveShell>
);

export default OwnerLayout;
