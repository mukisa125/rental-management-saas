import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Bell, PlusCircle, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const pageTitles = {
  '/super-admin/dashboard': ['Dashboard', 'Overview of platform metrics'],
  '/super-admin/customers': ['Customers', 'Manage customer accounts'],
  '/super-admin/subscriptions': ['Subscriptions', 'Subscription plans and status'],
};

const Topbar = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const paneRef = useRef(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [title, subtitle] = pageTitles[location.pathname] || ['Super Admin', 'Manage the platform'];

  useEffect(() => {
    if (!token || user?.role !== 'super_admin') return;

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const [pendingResponse, expiringResponse] = await Promise.all([
          api.get('/super-admin/pending-users', { params: { page: 1, limit: 20 } }),
          api.get('/super-admin/expiring-subscriptions', { params: { days: 5 } })
        ]);
        if (!cancelled) {
          setPendingUsers(Array.isArray(pendingResponse.data?.users) ? pendingResponse.data.users : []);
          setExpiringSubscriptions(Array.isArray(expiringResponse.data?.subscriptions) ? expiringResponse.data.subscriptions : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPendingUsers([]);
          setExpiringSubscriptions([]);
        }
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);
    window.addEventListener('super-admin-approvals-updated', fetchNotifications);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('super-admin-approvals-updated', fetchNotifications);
    };
  }, [token, user?.role]);

  useEffect(() => {
    if (!isNotificationOpen) return undefined;

    const handlePointerDown = (event) => {
      if (paneRef.current && !paneRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isNotificationOpen]);

  const pendingCount = pendingUsers.length;
  const expiringCount = expiringSubscriptions.length;
  const notificationCount = pendingCount + expiringCount;
  const latestPendingUsers = useMemo(() => pendingUsers.slice(0, 6), [pendingUsers]);
  const latestExpiringSubscriptions = useMemo(() => expiringSubscriptions.slice(0, 6), [expiringSubscriptions]);

  const openPendingUser = (pendingUser) => {
    window.sessionStorage.setItem('superAdminApprovalUser', JSON.stringify(pendingUser));
    setIsNotificationOpen(false);
    navigate(`/super-admin/customers?approvalUser=${pendingUser._id}`);
  };

  const openSubscriptions = () => {
    setIsNotificationOpen(false);
    navigate('/super-admin/subscriptions');
  };

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <input
            placeholder="Search customers, properties..."
            className="w-72 pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
        </div>

        <div className="relative" ref={paneRef}>
          <button
            type="button"
            onClick={() => setIsNotificationOpen((value) => !value)}
            className="relative p-2 rounded-md hover:bg-slate-50"
            aria-label="Pending account notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-5 text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">Approvals and subscription alerts</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  {notificationCount}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading && notificationCount === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">Loading notifications...</div>
                ) : notificationCount === 0 ? (
                  <div className="flex items-start gap-3 px-4 py-6">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">No active notifications</p>
                      <p className="text-xs text-slate-500">Approvals and expiring subscriptions will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {latestExpiringSubscriptions.map((subscription) => (
                      <button
                        type="button"
                        key={`expiry-${subscription._id}`}
                        onClick={openSubscriptions}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-amber-50"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-slate-900">{subscription.companyName}</p>
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                {subscription.daysRemaining}d left
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">Subscription expires within 5 days</p>
                            <p className="truncate text-xs text-slate-500">
                              {subscription.subscriptionPlan?.name || 'Current plan'} - {new Date(subscription.expiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}

                    {latestPendingUsers.map((pendingUser) => (
                      <button
                        type="button"
                        key={`approval-${pendingUser._id}`}
                        onClick={() => openPendingUser(pendingUser)}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{pendingUser.name}</p>
                            <p className="truncate text-xs text-slate-500">{pendingUser.email}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {pendingUser.role?.replace('_', ' ') || 'User'}
                              {pendingUser.company?.companyName ? ` - ${pendingUser.company.companyName}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Pending
                          </span>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700">
          <PlusCircle className="w-4 h-4" /> New
        </button>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white">
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-sm font-medium text-slate-700">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="hidden sm:block text-sm">
            <div className="font-medium text-slate-900">{user?.name}</div>
            <div className="text-xs text-slate-500">Super Admin</div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
