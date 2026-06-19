import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, FileText, BarChart2, Layers, Settings, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menu = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/super-admin/customers', label: 'Customers', icon: Users },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: FileText },
  { to: '/super-admin/reports', label: 'Reports', icon: BarChart2 },
  { to: '/super-admin/system-monitor', label: 'System Monitor', icon: Layers },
  { to: '/super-admin/activity-logs', label: 'Activity Logs', icon: Zap },
  { to: '/super-admin/settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-full hidden md:flex flex-col">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">RS</div>
          <div>
            <div className="text-lg font-semibold text-slate-900">RentSaaS</div>
            <div className="text-xs text-slate-500">Super Admin</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menu.map((m) => {
          const Icon = m.icon;
          const active = location.pathname === m.to;
          return (
            <Link
              key={m.to}
              to={m.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-2 text-sm transition-all ${
                active ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`${active ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'} p-2 rounded-md`}> 
                <Icon className="w-4 h-4" />
              </div>
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{user?.name || 'Super Admin'}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
          <div className="mt-2">
            <button
              onClick={logout}
              className="w-full text-sm font-medium text-red-600 border border-red-100 rounded-md py-2 hover:bg-red-50"
            >
              <div className="flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
