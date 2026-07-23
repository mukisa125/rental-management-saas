import SuperAdminTablePage from '../../components/super-admin/SuperAdminTablePage';

const SuperAdminPropertySeekers = () => (
  <SuperAdminTablePage
    endpoint="/super-admin/property-seekers"
    dataKey="propertySeekers"
    title="Property Seekers"
    subtitle="Google/property-seeker profiles, activity, and spend."
    enableUserActions
    userIdKey="userId"
    searchPlaceholder="Search seekers by name, email, location..."
    statusLabel="Account Status"
    statusField="status"
    statusOptions={[
      { label: 'Active', value: 'Active' },
      { label: 'Suspended', value: 'Suspended' }
    ]}
    secondaryLabel="Google Account"
    secondaryField="googleAccountStatus"
    secondaryOptions={[
      { label: 'Connected', value: 'Connected' },
      { label: 'Pending', value: 'Pending' }
    ]}
    columns={[
      { key: 'fullName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'phoneNumber', label: 'Phone Number' },
      { key: 'address', label: 'Address / Location' },
      { key: 'googleAccountStatus', label: 'Google Account Status' },
      { key: 'searchesCount', label: 'Searches', type: 'number' },
      { key: 'listingViews', label: 'Listing Views', type: 'number' },
      { key: 'detailUnlocks', label: 'Detail Unlocks', type: 'number' },
      { key: 'visitBookings', label: 'Visit Bookings', type: 'number' },
      { key: 'walletCredits', label: 'Wallet / Credits', type: 'currency' },
      { key: 'amountSpent', label: 'Amount Spent', type: 'currency' },
      { key: 'lastActive', label: 'Last Active', type: 'date' },
      { key: 'status', label: 'Status' },
      { key: 'joinedDate', label: 'Joined Date', type: 'date' }
    ]}
  />
);

export default SuperAdminPropertySeekers;
