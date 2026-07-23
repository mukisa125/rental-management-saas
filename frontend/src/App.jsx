import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import SystemToastHost from './components/SystemToastHost';
import TenantLayout from './layouts/TenantLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SelfOwnerLayout from './layouts/SelfOwnerLayout';
import ManagerLayout from './layouts/ManagerLayout';

// Super Admin Pages
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import SuperAdminLandlords from './pages/super-admin/SuperAdminLandlords';
import SuperAdminTenants from './pages/super-admin/SuperAdminTenants';
import SuperAdminPropertySeekers from './pages/super-admin/SuperAdminPropertySeekers';
import SuperAdminVacantListings from './pages/super-admin/SuperAdminVacantListings';
import SuperAdminViewsVisits from './pages/super-admin/SuperAdminViewsVisits';
import SuperAdminBilling from './pages/super-admin/SuperAdminBilling';
import SuperAdminAnnouncements from './pages/super-admin/SuperAdminAnnouncements';
import SuperAdminSupportTickets from './pages/super-admin/SuperAdminSupportTickets';
import SuperAdminSystemMonitor from './pages/super-admin/SuperAdminSystemMonitor';
import SuperAdminActivityLogs from './pages/super-admin/SuperAdminActivityLogs';
import SuperAdminSubscriptionAnalytics from './pages/super-admin/SuperAdminSubscriptionAnalytics';
import SuperAdminSubscriptions from './pages/super-admin/SuperAdminSubscriptions';
import SuperAdminRevenueAnalytics from './pages/super-admin/SuperAdminRevenueAnalytics';
import SuperAdminSettings from './pages/super-admin/SuperAdminSettings';

// Self Owner Pages
import SelfOwnerDashboard from './pages/self-owner/SelfOwnerDashboard';
import SelfOwnerProperties from './pages/self-owner/SelfOwnerPropertiesEnhanced';
import SelfOwnerUnits from './pages/self-owner/SelfOwnerUnits';
import SelfOwnerTenants from './pages/self-owner/SelfOwnerTenants';
import SelfOwnerPayments from './pages/self-owner/SelfOwnerPayments';
import SelfOwnerMaintenance from './pages/self-owner/SelfOwnerMaintenance';
import SelfOwnerReports from './pages/self-owner/SelfOwnerReports';
import SelfOwnerDocuments from './pages/self-owner/SelfOwnerDocuments';
import SelfOwnerProfile from './pages/self-owner/SelfOwnerProfile';
import SelfOwnerInvoices from './pages/self-owner/SelfOwnerInvoices';
import SelfOwnerNotices from './pages/self-owner/SelfOwnerNotices';
import SelfOwnerSettings from './pages/self-owner/SelfOwnerSettings';

// Tenant Pages
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantMyRental from './pages/tenant/TenantMyRental';
import TenantPayments from './pages/tenant/TenantPayments';
import TenantMaintenance from './pages/tenant/TenantMaintenance';
import TenantDocuments from './pages/tenant/TenantDocuments';
import TenantNotices from './pages/tenant/TenantNotices';
import TenantProfile from './pages/tenant/TenantProfile';
import TenantSettings from './pages/tenant/TenantSettings';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import TenantApplication from './pages/TenantApplication';
import ServiceProviderRequestForm from './pages/ServiceProviderRequestForm';
import PropertySeekerPage from './pages/property-seeker/PropertySeekerPage';
import { getDashboardPath } from './utils/authRoutes';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/tenant-application/:token" element={<TenantApplication />} />
      <Route path="/service-provider/request" element={<ServiceProviderRequestForm />} />
      <Route path="/property-seekers" element={<PropertySeekerPage />} />
      <Route path="/property-seekers/listing/:listingId" element={<PropertySeekerPage />} />
      <Route path="/property-seeker/dashboard" element={<PropertySeekerPage />} />

      {/* Tenant Routes */}
      <Route
        path="/tenant/dashboard"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantDashboard />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/my-rental"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantMyRental />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/my-property"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantMyRental />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/payments"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantPayments />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/maintenance"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantMaintenance />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/documents"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantDocuments />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/profile"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantProfile />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/notices"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantNotices />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/settings"
        element={
          <RoleProtectedRoute requiredRole="tenant">
            <TenantLayout>
              <TenantSettings />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin/dashboard"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminDashboard />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/landlords"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminLandlords />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/customers"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminLandlords />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/tenants"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminTenants />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/property-seekers"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminPropertySeekers />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/vacant-listings"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminVacantListings />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/views-visits"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminViewsVisits />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/system-monitor"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminSystemMonitor />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/activity-logs"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminActivityLogs />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/subscriptions"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminSubscriptions />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/billing"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminBilling />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/reports"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminRevenueAnalytics />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/support-tickets"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminSupportTickets />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/announcements"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminAnnouncements />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/settings"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminSettings />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/super-admin/subscription-analytics"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminSubscriptionAnalytics />
            </SuperAdminLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Manager Routes */}
      <Route
        path="/manager/dashboard"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerDashboard />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/properties"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerProperties />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/units"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout><SelfOwnerUnits /></ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/tenants"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerTenants />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/payments"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerPayments />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/maintenance"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerMaintenance />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/reports"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerReports />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/documents"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerDocuments />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/profile"
        element={
          <RoleProtectedRoute requiredRole="manager">
            <ManagerLayout>
              <SelfOwnerProfile />
            </ManagerLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Self Owner Routes */}
      <Route
        path="/self-owner/dashboard"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerDashboard />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/properties"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerProperties />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/units"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout><SelfOwnerUnits /></SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/tenants"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerTenants />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/payments"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerPayments />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/invoices"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout><SelfOwnerInvoices /></SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/maintenance"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerMaintenance />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/reports"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerReports />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/documents"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerDocuments />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/notices"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout><SelfOwnerNotices /></SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/settings"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerSettings />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/self-owner/profile"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerSettings />
            </SelfOwnerLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Redirect root based on role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to={getDashboardPath(user?.role)} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navigate to={getDashboardPath(user?.role)} replace />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <SystemToastHost />
      </Router>
    </AuthProvider>
  );
}

export default App;
