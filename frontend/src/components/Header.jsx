import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const Header = ({ title }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Dynamic title based on route if not provided
  const getTitleFromPath = () => {
    const path = location.pathname;
    
    const titleMap = {
      '/manager/dashboard': 'Dashboard',
      '/manager/properties': 'Properties',
      '/manager/units': 'Units',
      '/manager/tenants': 'Tenants',
      '/manager/payments': 'Rent Payments',
      '/manager/maintenance': 'Maintenance',
      '/manager/reports': 'Reports',
      '/manager/documents': 'Documents',
      '/manager/profile': 'Profile',
      '/tenant/dashboard': 'Dashboard',
      '/tenant/my-rental': 'My Rental',
      '/tenant/payments': 'Payment History',
      '/tenant/maintenance': 'Maintenance Requests',
      '/tenant/documents': 'Documents',
      '/tenant/profile': 'Profile',
      '/self-owner/dashboard': 'Dashboard',
      '/self-owner/properties': 'Properties',
      '/self-owner/units': 'Units',
      '/self-owner/tenants': 'Tenants',
      '/self-owner/payments': 'Payments',
      '/self-owner/invoices': 'Rent & Invoices',
      '/self-owner/maintenance': 'Maintenance',
      '/self-owner/reports': 'Reports',
      '/self-owner/documents': 'Documents',
      '/self-owner/notices': 'Notices',
      '/self-owner/profile': 'Profile',
      '/self-owner/settings': 'Settings',
      '/super-admin/dashboard': 'Dashboard',
      '/super-admin/customers': 'Customers',
      '/super-admin/system-monitor': 'System Monitor',
      '/super-admin/activity-logs': 'Activity Logs',
      '/super-admin/subscriptions': 'Subscriptions',
      '/super-admin/reports': 'Revenue Analytics',
      '/super-admin/settings': 'Settings',
    };

    return titleMap[path] || 'Dashboard';
  };

  const displayTitle = title || getTitleFromPath();

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{displayTitle}</h1>
        
        <div className="flex items-center space-x-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user?.name || 'User'}</p>
              <p className="text-gray-500 text-xs">{user?.role || 'Account'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
