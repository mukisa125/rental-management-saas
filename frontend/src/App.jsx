import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import OwnerLayout from './layouts/OwnerLayout';
import TenantLayout from './layouts/TenantLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SelfOwnerLayout from './layouts/SelfOwnerLayout';

// Manager Pages
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Units from './pages/Units';
import Tenants from './pages/Tenants';
import RentPayments from './pages/RentPayments';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Owner Pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerProperties from './pages/owner/OwnerProperties';
import OwnerFinancials from './pages/owner/OwnerFinancials';
import OwnerMaintenance from './pages/owner/OwnerMaintenance';
import OwnerReports from './pages/owner/OwnerReports';
import OwnerProfile from './pages/owner/OwnerProfile';

// Super Admin Pages
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import SuperAdminCustomers from './pages/super-admin/SuperAdminCustomers';
import SuperAdminSystemMonitor from './pages/super-admin/SuperAdminSystemMonitor';
import SuperAdminActivityLogs from './pages/super-admin/SuperAdminActivityLogs';
import SuperAdminSubscriptionAnalytics from './pages/super-admin/SuperAdminSubscriptionAnalytics';
import SuperAdminSubscriptions from './pages/super-admin/SuperAdminSubscriptions';
import SuperAdminRevenueAnalytics from './pages/super-admin/SuperAdminRevenueAnalytics';
import SuperAdminSettings from './pages/super-admin/SuperAdminSettings';

// Self Owner Pages
import SelfOwnerDashboard from './pages/self-owner/SelfOwnerDashboard';
import SelfOwnerProperties from './pages/self-owner/SelfOwnerProperties';
import SelfOwnerUnits from './pages/self-owner/SelfOwnerUnits';
import SelfOwnerTenants from './pages/self-owner/SelfOwnerTenants';
import SelfOwnerPayments from './pages/self-owner/SelfOwnerPayments';
import SelfOwnerMaintenance from './pages/self-owner/SelfOwnerMaintenance';
import SelfOwnerReports from './pages/self-owner/SelfOwnerReports';
import SelfOwnerDocuments from './pages/self-owner/SelfOwnerDocuments';
import SelfOwnerProfile from './pages/self-owner/SelfOwnerProfile';
import SelfOwnerInvoices from './pages/self-owner/SelfOwnerInvoices';
import SelfOwnerNotices from './pages/self-owner/SelfOwnerNotices';

// Tenant Pages
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantMyRental from './pages/tenant/TenantMyRental';
import TenantPayments from './pages/tenant/TenantPayments';
import TenantMaintenance from './pages/tenant/TenantMaintenance';
import TenantDocuments from './pages/tenant/TenantDocuments';
import TenantProfile from './pages/tenant/TenantProfile';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
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

      {/* Manager Routes - Explicit routing */}
      <Route
        path="/manager/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/properties"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Properties />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/units"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Units />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/tenants"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Tenants />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/payments"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <RentPayments />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/maintenance"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Maintenance />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/reports"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manager/settings"
        element={
          <RoleProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Owner Routes */}
      <Route
        path="/owner/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={['owner', 'manager']}>
            <OwnerLayout>
              <OwnerDashboard />
            </OwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/owner/properties"
        element={
          <RoleProtectedRoute allowedRoles={['owner', 'manager']}>
            <OwnerLayout>
              <OwnerProperties />
            </OwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/owner/financials"
        element={
          <RoleProtectedRoute allowedRoles={['owner', 'manager']}>
            <OwnerLayout>
              <OwnerFinancials />
            </OwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/owner/maintenance"
        element={
          <RoleProtectedRoute allowedRoles={['owner', 'manager']}>
            <OwnerLayout>
              <OwnerMaintenance />
            </OwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/owner/reports"
        element={
          <RoleProtectedRoute allowedRoles={['owner', 'manager']}>
            <OwnerLayout>
              <OwnerReports />
            </OwnerLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/owner/profile"
        element={
          <RoleProtectedRoute allowedRoles={['owner', 'manager']}>
            <OwnerLayout>
              <OwnerProfile />
            </OwnerLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Tenant Routes */}
      <Route
        path="/tenant/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={['tenant', 'manager']}>
            <TenantLayout>
              <TenantDashboard />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/my-rental"
        element={
          <RoleProtectedRoute allowedRoles={['tenant', 'manager']}>
            <TenantLayout>
              <TenantMyRental />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/payments"
        element={
          <RoleProtectedRoute allowedRoles={['tenant', 'manager']}>
            <TenantLayout>
              <TenantPayments />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/maintenance"
        element={
          <RoleProtectedRoute allowedRoles={['tenant', 'manager']}>
            <TenantLayout>
              <TenantMaintenance />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/documents"
        element={
          <RoleProtectedRoute allowedRoles={['tenant', 'manager']}>
            <TenantLayout>
              <TenantDocuments />
            </TenantLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant/profile"
        element={
          <RoleProtectedRoute allowedRoles={['tenant', 'manager']}>
            <TenantLayout>
              <TenantProfile />
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
        path="/super-admin/customers"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminCustomers />
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
        path="/super-admin/settings"
        element={
          <RoleProtectedRoute requiredRole="super_admin">
            <SuperAdminLayout>
              <SuperAdminSettings />
            </SuperAdminLayout>
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
        path="/self-owner/profile"
        element={
          <RoleProtectedRoute requiredRole="self_owner">
            <SelfOwnerLayout>
              <SelfOwnerProfile />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
