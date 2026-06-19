import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Wrench,
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const OwnerSidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { path: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/owner/properties', icon: Building2, label: 'Properties' },
    { path: '/owner/financials', icon: DollarSign, label: 'Financials' },
    { path: '/owner/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/owner/reports', icon: BarChart3, label: 'Reports' },
    { path: '/owner/profile', icon: Settings, label: 'Profile' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-primary-900 min-h-screen fixed left-0 top-0 z-40">
      <div className="p-6">
        <h1 className="text-white text-xl font-bold">Rental SaaS</h1>
        <p className="text-primary-300 text-xs mt-1">Property Owner Portal</p>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary-700 text-white border-r-4 border-primary-400'
                  : 'text-primary-100 hover:bg-primary-800'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <button
          onClick={logout}
          className="flex items-center w-full px-6 py-3 text-sm font-medium text-primary-100 hover:bg-primary-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default OwnerSidebar;
