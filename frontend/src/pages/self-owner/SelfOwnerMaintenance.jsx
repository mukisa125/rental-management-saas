import { useEffect, useState, useCallback } from 'react';
import MaintenanceSummaryCards from '../../components/maintenance/MaintenanceSummaryCards';
import MaintenanceFilters from '../../components/maintenance/MaintenanceFilters';
import MaintenanceTable from '../../components/maintenance/MaintenanceTable';
import ViewMaintenanceModal from '../../components/maintenance/ViewMaintenanceModal';
import AddMaintenanceModal from '../../components/maintenance/AddMaintenanceModal';
import ServiceProvidersModal from '../../components/maintenance/ServiceProvidersModal';
import { selfOwnerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SERVICE_PROVIDER_STORAGE_KEY = 'selfOwnerServiceProviders';

export default function SelfOwnerMaintenance() {
  const { user } = useAuth();
  // State
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({});

  const [filters, setFilters] = useState({
    search: '',
    property: '',
    unit: '',
    status: '',
    priority: '',
    source: ''
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [serviceProviders, setServiceProviders] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SERVICE_PROVIDER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setServiceProviders(parsed);
      }
    } catch (error) {
      console.error('Failed to load service providers:', error);
    }
  }, []);

  const handleSaveProviders = (providers) => {
    setServiceProviders(providers);
    localStorage.setItem(SERVICE_PROVIDER_STORAGE_KEY, JSON.stringify(providers));
  };

  // Fetch maintenance requests
  const fetchMaintenance = useCallback(async () => {
    try {
      setPageLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: filters.search,
        property: filters.property,
        unit: filters.unit,
        status: filters.status,
        priority: filters.priority,
        source: filters.source
      };

      // Remove empty params
      Object.keys(params).forEach(
        (key) => params[key] === '' && delete params[key]
      );

      const response = await selfOwnerAPI.getMaintenance(params);
      setRequests(response.data?.requests || []);
      setTotalPages(response.data?.pagination?.pages || response.data?.pagination?.totalPages || 1);
      setSummary(response.data?.summary || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching maintenance:', err);
      setError(err.response?.data?.message || 'Failed to fetch maintenance requests');
    } finally {
      setPageLoading(false);
    }
  }, [currentPage, filters]);

  // Fetch properties and units
  const fetchPropertiesAndUnits = useCallback(async () => {
    try {
      const [propsRes, unitsRes] = await Promise.all([
        selfOwnerAPI.getProperties(),
        selfOwnerAPI.getUnits()
      ]);
      setProperties(propsRes.data?.properties || []);
      setUnits(unitsRes.data?.units || []);
    } catch (err) {
      console.error('Error fetching properties/units:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchPropertiesAndUnits();
        await fetchMaintenance();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Refetch on filter changes
  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      fetchMaintenance();
    }
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle add request
  const handleAddRequest = async (formData) => {
    try {
      setPageLoading(true);
      await selfOwnerAPI.createMaintenance(formData);
      setShowAddModal(false);
      setCurrentPage(1);
      await fetchMaintenance();
      window.dispatchEvent(new Event('maintenance-updated'));
    } catch (err) {
      console.error('Error creating maintenance request:', err);
      alert(err.response?.data?.message || 'Failed to create maintenance request');
    } finally {
      setPageLoading(false);
    }
  };

  // Handle view request
  const handleViewRequest = async (request) => {
    try {
      const response = await selfOwnerAPI.getMaintenanceById(request._id);
      setSelectedRequest(response.data?.request || request);
    } catch {
      setSelectedRequest(request);
    }
    setShowViewModal(true);
  };

  // Handle status change
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await selfOwnerAPI.updateMaintenanceStatus(requestId, newStatus);
      await fetchMaintenance();
      window.dispatchEvent(new Event('maintenance-updated'));
      if (selectedRequest?._id === requestId) {
        const refreshed = await selfOwnerAPI.getMaintenanceById(requestId);
        setSelectedRequest(refreshed.data?.request || null);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddComment = async (requestId, comment) => {
    try {
      const response = await selfOwnerAPI.addMaintenanceComment(requestId, { comment });
      setSelectedRequest(response.data?.request || null);
      await fetchMaintenance();
      window.dispatchEvent(new Event('maintenance-updated'));
    } catch (err) {
      console.error('Error adding maintenance comment:', err);
      alert(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleApproveRequest = async (requestId) => {
    await handleStatusChange(requestId, 'approved');
  };

  const handleCompleteRequest = async (requestId) => {
    await handleStatusChange(requestId, 'completed');
  };

  const handleAssignProvider = async (requestId, provider) => {
    if (!provider) return;

    try {
      const response = await selfOwnerAPI.updateMaintenance(requestId, {
        technicianName: provider.name,
        technicianPhone: provider.tel,
        technicianService: provider.service,
        technicianAddress: provider.address,
        status: 'assigned'
      });

      const updated = response.data?.request || null;
      setSelectedRequest(updated);
      await fetchMaintenance();
      window.dispatchEvent(new Event('maintenance-updated'));
    } catch (err) {
      console.error('Error assigning service provider:', err);
      alert(err.response?.data?.message || 'Failed to assign service provider');
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to delete this maintenance request?')) {
      try {
        await selfOwnerAPI.deleteMaintenance(requestId);
        await fetchMaintenance();
        window.dispatchEvent(new Event('maintenance-updated'));
        if (selectedRequest?._id === requestId) {
          setShowViewModal(false);
          setSelectedRequest(null);
        }
      } catch (err) {
        console.error('Error deleting maintenance:', err);
        alert(err.response?.data?.message || 'Failed to delete maintenance request');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Maintenance Requests
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage maintenance requests from tenants and self-reported issues
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <MaintenanceSummaryCards summary={summary} />

      {/* Filters */}
      <MaintenanceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        properties={properties}
        units={units}
        onAddRequest={() => setShowAddModal(true)}
        onManageProviders={() => setShowProvidersModal(true)}
      />

      {/* Table */}
      <MaintenanceTable
        requests={requests}
        loading={pageLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onViewRequest={handleViewRequest}
        onApproveRequest={handleApproveRequest}
        onCompleteRequest={handleCompleteRequest}
        onDeleteRequest={handleDeleteRequest}
      />

      {/* View Maintenance Modal */}
      {showViewModal && selectedRequest && (
        <ViewMaintenanceModal
          request={selectedRequest}
          landlord={{
            name: user?.name || user?.fullName || user?.companyName || 'Landlord',
            phone: user?.phone || user?.company?.phone || '',
            email: user?.email || user?.company?.email || '',
            company: user?.company?.companyName || user?.companyName || ''
          }}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
          onStatusChange={handleStatusChange}
          onAddComment={handleAddComment}
          onDelete={handleDeleteRequest}
          providers={serviceProviders}
          onAssignServiceProvider={handleAssignProvider}
        />
      )}

      {showProvidersModal && (
        <ServiceProvidersModal
          providers={serviceProviders}
          onSave={handleSaveProviders}
          onClose={() => setShowProvidersModal(false)}
        />
      )}

      {/* Add Maintenance Modal */}
      {showAddModal && (
        <AddMaintenanceModal
          properties={properties}
          units={units}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddRequest}
          loading={pageLoading}
        />
      )}
    </div>
  );
}
