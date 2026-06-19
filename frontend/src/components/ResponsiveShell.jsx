import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, Building2, CheckCircle2, ChevronDown, LogOut, Menu, Moon, Search, ShieldCheck, Sun, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const themeClasses = {
  primary: {
    aside: 'bg-primary-900 text-white',
    muted: 'text-primary-200',
    active: 'bg-primary-700 text-white border-primary-400',
    inactive: 'text-primary-100 hover:bg-primary-800',
    avatar: 'bg-primary-700 text-white',
  },
  blue: {
    aside: 'bg-blue-900 text-white',
    muted: 'text-blue-200',
    active: 'bg-blue-800 text-white border-yellow-400',
    inactive: 'text-blue-100 hover:bg-blue-800',
    avatar: 'bg-blue-700 text-white',
  },
  light: {
    aside: 'bg-white text-slate-900 border-r border-slate-200',
    muted: 'text-slate-500',
    active: 'bg-blue-600 text-white border-blue-600 shadow-[0_10px_24px_rgba(37,99,235,0.28)]',
    inactive: 'text-slate-600 hover:bg-blue-50 hover:text-blue-700',
    avatar: 'bg-blue-600 text-white',
  },
};

const ResponsiveShell = ({
  brand = 'RentSaaS',
  roleLabel = 'Dashboard',
  pageTitle,
  pageSubtitle,
  menuItems = [],
  theme = 'primary',
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationRef = useRef(null);
  const accountRef = useRef(null);
  const { user, token, logout, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const colors = themeClasses[theme] || themeClasses.primary;
  const isLight = theme === 'light';
  const isSuperAdmin = user?.role === 'super_admin' || roleLabel === 'Super Admin';
  const pendingCount = pendingUsers.length;
  const expiringCount = expiringSubscriptions.length;
  const notificationCount = pendingCount + expiringCount;
  const latestPendingUsers = useMemo(() => pendingUsers.slice(0, 6), [pendingUsers]);
  const latestExpiringSubscriptions = useMemo(() => expiringSubscriptions.slice(0, 6), [expiringSubscriptions]);

  useEffect(() => {
    if (!token || !isSuperAdmin) return undefined;

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
  }, [token, isSuperAdmin]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!profileOpen) return;

    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      password: '',
      confirmPassword: ''
    });
    setProfileMessage(null);
  }, [profileOpen, user?.email, user?.name, user?.phone]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const openProfileDialog = () => {
    setAccountMenuOpen(false);
    setProfileOpen(true);
  };

  const closeProfileDialog = () => {
    if (profileSaving) return;
    setProfileOpen(false);
    setProfileMessage(null);
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    if (profileForm.password && profileForm.password.length < 6) {
      setProfileMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setProfileSaving(false);
      return;
    }

    if (profileForm.password !== profileForm.confirmPassword) {
      setProfileMessage({ type: 'error', text: 'Passwords do not match' });
      setProfileSaving(false);
      return;
    }

    const payload = {
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone
    };

    if (profileForm.password) {
      payload.password = profileForm.password;
    }

    const result = await updateProfile(payload);
    if (result.success) {
      setProfileForm((currentForm) => ({
        ...currentForm,
        password: '',
        confirmPassword: ''
      }));
      setProfileMessage({ type: 'success', text: result.message || 'Profile updated successfully' });
    } else {
      setProfileMessage({ type: 'error', text: result.error });
    }

    setProfileSaving(false);
  };

  const openPendingUser = (pendingUser) => {
    window.sessionStorage.setItem('superAdminApprovalUser', JSON.stringify(pendingUser));
    setNotificationsOpen(false);
    navigate(`/super-admin/customers?approvalUser=${pendingUser._id}`);
  };

  const openSubscriptions = () => {
    setNotificationsOpen(false);
    navigate('/super-admin/subscriptions');
  };

  const sidebar = (
    <div className={`flex h-full min-h-0 w-72 flex-col ${colors.aside}`}>
      <div className={`px-5 py-6 ${isLight ? '' : 'border-b border-white/10'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-black leading-tight tracking-normal">{brand}</div>
            <div className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${colors.muted}`}>
              {roleLabel}
              {isLight && <ShieldCheck className="h-4 w-4 fill-blue-600 text-blue-600" />}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || location.pathname === item.path;
          const to = item.to || item.path;

          return (
            <Link
              key={`${item.label}-${to}`}
              to={to}
              onClick={() => setOpen(false)}
              className={`mb-2 flex items-center gap-3 rounded-[10px] border px-4 py-3 text-sm font-bold transition-colors ${
                active ? colors.active : `border-transparent ${colors.inactive}`
              }`}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" />}
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`${isLight ? 'm-5 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]' : 'border-t border-white/10 p-4'}`}>
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.avatar}`}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{user?.name || 'User'}</div>
            <div className={`truncate text-xs ${colors.muted}`}>{user?.email}</div>
          </div>
          {isLight && <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${
            isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-50' : 'border-white/15 hover:bg-white/10'
          }`}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className={`${isLight ? 'bg-[#f8fbff]' : 'bg-gray-50'} min-h-screen lg:flex`}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full max-w-[86vw] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
              className="rounded-lg border border-slate-200 p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 md:hidden"
            >
              {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black tracking-normal text-slate-950 sm:text-2xl">{pageTitle || roleLabel}</h1>
              {pageSubtitle && <p className="mt-1 hidden text-sm font-semibold text-slate-500 sm:block">{pageSubtitle}</p>}
            </div>

            {isLight && (
              <div className="hidden min-w-[260px] max-w-xl flex-1 items-center gap-3 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 shadow-sm xl:flex">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search customers, properties, subscriptions..."
                  className="w-full border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">⌘K</span>
              </div>
            )}

            <div className="hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
              </button>
              {isLight && (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((value) => !value)}
                    className="relative rounded-[10px] border border-slate-200 p-3 text-slate-700 hover:bg-slate-50"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-14 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-xl">
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
                                    <p className="mt-1 text-xs capitalize text-slate-500">
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
              )}
            </div>

            <div className="relative hidden min-w-0 sm:block" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((value) => !value)}
                className="flex min-w-0 items-center gap-3 rounded-[10px] px-2 py-1.5 text-left hover:bg-slate-50"
                aria-label="Account menu"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors.avatar}`}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 text-sm">
                  <div className="max-w-40 truncate font-bold text-gray-900">{user?.name || 'User'}</div>
                  <div className="truncate text-xs font-semibold text-gray-500">{user?.email || user?.role || roleLabel}</div>
                </div>
                {isLight && <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 text-left shadow-xl">
                  <button
                    type="button"
                    onClick={openProfileDialog}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="h-4 w-4 text-slate-500" />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Profile</h2>
                <p className="mt-1 text-sm text-slate-500">Review and update your account details.</p>
              </div>
              <button
                type="button"
                onClick={closeProfileDialog}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close profile"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Username
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Phone
                <input
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Not provided"
                />
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Change password</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Leave these fields empty to keep your current password.</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    New password
                    <input
                      type="password"
                      name="password"
                      value={profileForm.password}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="New password"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Confirm password
                    <input
                      type="password"
                      name="confirmPassword"
                      value={profileForm.confirmPassword}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Confirm password"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Role</p>
                  <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium capitalize text-slate-600">
                    {user?.role?.replace('_', ' ') || roleLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Company</p>
                  <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                    {user?.company?.companyName || user?.companyName || 'Not assigned'}
                  </p>
                </div>
              </div>

              {profileMessage && (
                <div className={`rounded-md px-3 py-2 text-sm font-semibold ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                  {profileMessage.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeProfileDialog}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {profileSaving ? 'Updating...' : 'Update profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveShell;
