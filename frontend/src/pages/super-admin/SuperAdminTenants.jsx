import SuperAdminTablePage from '../../components/super-admin/SuperAdminTablePage';

const SuperAdminTenants = () => (
  <SuperAdminTablePage
    endpoint="/super-admin/tenants"
    dataKey="tenants"
    title="Tenants"
    subtitle="Tenant records linked to landlord, property, and unit."
    enableUserActions
    userIdKey="userId"
    searchPlaceholder="Search tenants by name, email, phone..."
    statusLabel="Lease Status"
    statusField="leaseStatus"
    statusOptions={[
      { label: 'Active', value: 'active' },
      { label: 'Pending', value: 'pending' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Terminated', value: 'terminated' },
      { label: 'Renewed', value: 'renewed' }
    ]}
    secondaryLabel="Payment Status"
    secondaryField="paymentStatus"
    secondaryOptions={[
      { label: 'Paid', value: 'paid' },
      { label: 'Pending', value: 'pending' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Failed', value: 'failed' },
      { label: 'Partial', value: 'partial' }
    ]}
    columns={[
      { key: 'tenantName', label: 'Tenant Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'landlord', label: 'Landlord' },
      { key: 'property', label: 'Property' },
      { key: 'unit', label: 'Unit' },
      { key: 'leaseStatus', label: 'Lease Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'joinedDate', label: 'Joined Date', type: 'date' }
    ]}
  />
);

export default SuperAdminTenants;
