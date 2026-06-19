import React from 'react';
import { Outlet } from 'react-router-dom';
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
  { to: '/self-owner/profile', label: 'Settings', icon: Settings },
];

const SelfOwnerLayout = ({ children }) => (
  <ResponsiveShell
    brand="RentSaaS"
    roleLabel="Self Owner"
    pageTitle="Property Management"
    menuItems={selfOwnerMenu}
    theme="blue"
  >
    {children || <Outlet />}
  </ResponsiveShell>
);

export default SelfOwnerLayout;
