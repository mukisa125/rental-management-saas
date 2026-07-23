import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, LogOut, Menu, Moon, Search, ShieldCheck, Sun, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import BrandLogo from './BrandLogo';
import { PLATFORM_NAME } from '../constants/brand';

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
    active: 'bg-blue-600 text-white border-blue-600 shadow-[0_12px_24px_rgba(37,99,235,0.20)]',
    inactive: 'text-slate-600 hover:bg-blue-50 hover:text-blue-700',
    avatar: 'bg-blue-600 text-white',
  },
};

const ResponsiveShell = ({
  brand = PLATFORM_NAME,
  roleLabel = 'Dashboard',
  pageTitle,
  pageSubtitle,
  searchPlaceholder = 'Search customers, properties, subscriptions...',
  menuItems = [],
  theme = 'primary',
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    password: '',
    confirmPassword: ''
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState([]);
  const [ownerNotifications, setOwnerNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationRef = useRef(null);
  const accountRef = useRef(null);
  const searchRef = useRef(null);
  const { user, token, logout, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const colors = themeClasses[theme] || themeClasses.primary;
  const isLight = theme === 'light';
  const isSuperAdmin = user?.role === 'super_admin' || roleLabel === 'Super Admin';
  const isSelfOwner = user?.role === 'self_owner' || roleLabel === 'Self Owner';
  const isTenant = user?.role === 'tenant' || roleLabel === 'Tenant';
  const pendingCount = pendingUsers.length;
  const expiringCount = expiringSubscriptions.length;
  const notificationCount = (isSelfOwner || isTenant)
    ? ownerNotifications.filter((notification) => !notification.isRead).length
    : pendingCount + expiringCount;
  const latestPendingUsers = useMemo(() => pendingUsers.slice(0, 6), [pendingUsers]);
  const latestExpiringSubscriptions = useMemo(() => expiringSubscriptions.slice(0, 6), [expiringSubscriptions]);
  const latestOwnerNotifications = useMemo(() => ownerNotifications.slice(0, 12), [ownerNotifications]);
  const quickSearchItems = useMemo(
    () => menuItems.map((item) => ({
      label: item.label,
      section: item.section || '',
      to: item.to || item.path || '/',
      keywords: `${item.label || ''} ${item.section || ''} ${item.to || item.path || ''}`.toLowerCase()
    })),
    [menuItems]
  );
  const matchedSearchItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return quickSearchItems
      .filter((item) => item.keywords.includes(query))
      .slice(0, 8);
  }, [quickSearchItems, searchQuery]);

  const resolveAvatar = (avatarValue) => {
    if (!avatarValue) return '';
    if (avatarValue.startsWith('data:') || avatarValue.startsWith('http://') || avatarValue.startsWith('https://')) {
      return avatarValue;
    }
    return `data:image/webp;base64,${avatarValue}`;
  };

  const userAvatar = resolveAvatar(user?.avatar);
  const normalizePath = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '/';
    return text.length > 1 && text.endsWith('/') ? text.replace(/\/+$/, '') : text;
  };

  useEffect(() => {
    if (!token || (!isSuperAdmin && !isSelfOwner && !isTenant)) return undefined;

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        if (!cancelled) {
          if (isSelfOwner || isTenant) {
            const response = await api.get('/notifications');
            if (!cancelled) setOwnerNotifications(Array.isArray(response.data) ? response.data : []);
          } else {
            const [pendingResponse, expiringResponse] = await Promise.all([
              api.get('/super-admin/pending-users', { params: { page: 1, limit: 20 } }),
              api.get('/super-admin/expiring-subscriptions', { params: { days: 5 } })
            ]);
            if (!cancelled) {
              setPendingUsers(Array.isArray(pendingResponse.data?.users) ? pendingResponse.data.users : []);
              setExpiringSubscriptions(Array.isArray(expiringResponse.data?.subscriptions) ? expiringResponse.data.subscriptions : []);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setPendingUsers([]);
          setExpiringSubscriptions([]);
          setOwnerNotifications([]);
        }
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);
    window.addEventListener('super-admin-approvals-updated', fetchNotifications);
    window.addEventListener('tenant-applications-updated', fetchNotifications);
    window.addEventListener('maintenance-updated', fetchNotifications);
    window.addEventListener('tenant-notifications-updated', fetchNotifications);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('super-admin-approvals-updated', fetchNotifications);
      window.removeEventListener('tenant-applications-updated', fetchNotifications);
      window.removeEventListener('maintenance-updated', fetchNotifications);
      window.removeEventListener('tenant-notifications-updated', fetchNotifications);
    };
  }, [token, isSuperAdmin, isSelfOwner, isTenant]);

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
    if (!searchOpen) return undefined;
    const handlePointerDown = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!profileOpen) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
      password: '',
      confirmPassword: ''
    });
    setProfileMessage(null);
  }, [profileOpen, user?.avatar, user?.email, user?.name, user?.phone]);

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

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((currentForm) => ({ ...currentForm, avatar: String(reader.result || '') }));
      setProfileMessage(null);
    };
    reader.onerror = () => setProfileMessage({ type: 'error', text: 'Unable to read selected image.' });
    reader.readAsDataURL(file);
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
      phone: profileForm.phone,
      avatar: profileForm.avatar
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

  const openOwnerNotification = async (notification) => {
    setNotificationsOpen(false);
    if (!notification.isRead) {
      setOwnerNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      try { await api.put(`/notifications/${notification._id}/read`); } catch { /* Keep the notification usable even if marking it read fails. */ }
      window.dispatchEvent(new Event('tenant-notifications-updated'));
    }
    const destination = notification.actionUrl || notification.actionButton?.url;
    if (destination?.startsWith('/')) navigate(destination);
  };

  const applySearch = (queryValue) => {
    const query = String(queryValue || '').trim();
    window.dispatchEvent(new CustomEvent('dashboard-global-search', { detail: { query } }));
    if (!query) {
      setSearchOpen(false);
      return;
    }
    const firstMatch = quickSearchItems.find((item) => item.keywords.includes(query.toLowerCase()));
    if (firstMatch) {
      navigate(firstMatch.to);
      setOpen(false);
      setSearchOpen(false);
    }
  };

  const sidebar = (
    <div className={`flex h-full min-h-0 w-72 flex-col ${colors.aside}`}>
      <div className={`px-5 py-6 ${isLight ? 'border-b border-slate-100' : 'border-b border-white/10'}`}>
        <div className="flex items-center gap-3">
          <BrandLogo size="lg" tone={isLight ? 'solid' : 'onDark'} />
          <div>
            <div className="text-[1.38rem] font-black leading-tight tracking-normal">{brand}</div>
            <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${colors.muted}`}>
              {roleLabel}
              {isLight && <ShieldCheck className="h-4 w-4 fill-blue-600 text-blue-600" />}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const to = item.to || item.path;
          const currentPath = normalizePath(location.pathname);
          const targets = [to, ...(Array.isArray(item.aliases) ? item.aliases : [])].map(normalizePath);
          const active = targets.some((target) => currentPath === target || currentPath.startsWith(`${target}/`));
          const previousSection = menuItems[index - 1]?.section || '';
          const showSectionHeader = Boolean(item.section) && item.section !== previousSection;

          return (
            <div key={`${item.label}-${to}`}>
              {showSectionHeader ? (
                <div className={`mb-2 mt-4 px-2 text-[11px] font-extrabold uppercase tracking-wide ${colors.muted}`}>
                  {item.section}
                </div>
              ) : null}
              <Link
                to={to}
                onClick={() => setOpen(false)}
                className={`mb-1.5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  active ? colors.active : `border-transparent ${colors.inactive}`
                }`}
              >
                {Icon && <Icon className="h-5 w-5 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className={`${isLight ? 'm-5 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]' : 'border-t border-white/10 p-4'}`}>
        <div className="mb-4 flex min-w-0 items-center gap-3">
          {userAvatar ? (
            <img src={userAvatar} alt={user?.name || 'User'} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover" />
          ) : (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.avatar}`}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{user?.name || 'User'}</div>
            <div className={`truncate text-xs ${colors.muted}`}>{user?.email}</div>
          </div>
          {isLight && <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
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
    <div className={`${isLight ? 'bg-slate-50' : 'bg-gray-50'} min-h-screen lg:flex`}>
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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center gap-3 px-4 py-3 sm:px-6 lg:px-7">
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
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
              <h1 className="truncate text-xl font-black tracking-normal text-slate-950 sm:text-[1.7rem]">{pageTitle || roleLabel}</h1>
              {pageSubtitle && <p className="mt-1 hidden text-sm font-semibold text-slate-500 sm:block">{pageSubtitle}</p>}
            </div>

            {isLight && (
              <div className="relative hidden min-w-[260px] max-w-xl flex-1 xl:block" ref={searchRef}>
                <form
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applySearch(searchQuery);
                  }}
                >
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchOpen(Boolean(event.target.value.trim()));
                      window.dispatchEvent(new CustomEvent('dashboard-global-search', { detail: { query: event.target.value.trim() } }));
                    }}
                    onFocus={() => setSearchOpen(Boolean(searchQuery.trim()))}
                    placeholder={searchPlaceholder}
                    className="w-full border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </form>
                {searchOpen && (
                  <div className="absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {matchedSearchItems.length ? (
                      matchedSearchItems.map((item) => (
                        <button
                          key={`${item.to}-${item.label}`}
                          type="button"
                          onClick={() => {
                            setSearchQuery(item.label);
                            applySearch(item.label);
                          }}
                          className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 last:border-b-0"
                        >
                          <span className="font-semibold text-slate-800">{item.label}</span>
                          <span className="text-xs text-slate-500">{item.section || roleLabel}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No matches found.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 md:inline-flex"
              >
                {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
              </button>
              {isLight && (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((value) => !value)}
                    className="relative rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm hover:bg-slate-50"
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
                          <p className="text-xs text-slate-500">
                            {isSelfOwner
                              ? 'Maintenance and tenant request updates'
                              : isTenant
                                ? 'Notices and updates from your landlord'
                                : 'Approvals and subscription alerts'}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          {notificationCount}
                        </span>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {notificationsLoading && ((isSelfOwner || isTenant) ? ownerNotifications.length === 0 : notificationCount === 0) ? (
                          <div className="px-4 py-6 text-sm text-slate-500">Loading notifications...</div>
                        ) : ((isSelfOwner || isTenant) ? ownerNotifications.length === 0 : notificationCount === 0) ? (
                          <div className="flex items-start gap-3 px-4 py-6">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">No active notifications</p>
                              <p className="text-xs text-slate-500">{(isSelfOwner || isTenant) ? 'Maintenance updates will appear here.' : 'Approvals and expiring subscriptions will appear here.'}</p>
                            </div>
                          </div>
                        ) : (
                          (isSelfOwner || isTenant) ? latestOwnerNotifications.map((notification) => {
                            const isApproval = notification.type === 'tenant_approved';
                            const isMaintenanceComplete = notification.type === 'maintenance_completed';
                            const badgeClass = isMaintenanceComplete || isApproval
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700';
                            const badgeLabel = notification.isRead ? 'Read' : 'New';
                            return <button
                              type="button"
                              key={notification._id}
                              onClick={() => openOwnerNotification(notification)}
                              className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${notification.isRead ? 'opacity-70' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                {isMaintenanceComplete || isApproval ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-900">{notification.title}</p><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>{badgeLabel}</span></div>
                                  <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                                </div>
                              </div>
                            </button>;
                          }) : <>
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
                className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50"
                aria-label="Account menu"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={user?.name || 'User'} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors.avatar}`}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
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

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-7">{children}</main>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-2xl">
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
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {resolveAvatar(profileForm.avatar) ? (
                  <img src={resolveAvatar(profileForm.avatar)} alt={profileForm.name || 'Profile'} className="h-14 w-14 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600">
                    {(profileForm.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile image</label>
                  <input
                    type="text"
                    name="avatar"
                    value={profileForm.avatar}
                    onChange={handleProfileChange}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Paste image URL or data URL"
                  />
                  <label className="mt-2 inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Upload image
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

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
