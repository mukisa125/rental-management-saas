import { Outlet } from 'react-router-dom';
import { BarChart2, Building2, CreditCard, Home, Settings, Users, Wrench } from 'lucide-react';
import ResponsiveShell from '../components/ResponsiveShell';

const managerMenu = [
  { to: '/manager/dashboard', label: 'Dashboard', icon: Home },
  { to: '/manager/properties', label: 'Properties', icon: Building2 },
  { to: '/manager/units', label: 'Units', icon: BarChart2 },
  { to: '/manager/tenants', label: 'Tenants', icon: Users },
  { to: '/manager/payments', label: 'Payments', icon: CreditCard },
  { to: '/manager/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/manager/reports', label: 'Reports', icon: BarChart2 },
  { to: '/manager/settings', label: 'Settings', icon: Settings },
];

const DashboardLayout = ({ children }) => (
  <ResponsiveShell
    brand="Rental SaaS"
    roleLabel="Property Manager"
    pageTitle="Property Management"
    menuItems={managerMenu}
    theme="light"
  >
    {children || <Outlet />}
  </ResponsiveShell>
);

export default DashboardLayout;
