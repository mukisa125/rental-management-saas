import SuperAdminTablePage from '../../components/super-admin/SuperAdminTablePage';

const SuperAdminVacantListings = () => (
  <SuperAdminTablePage
    endpoint="/super-admin/vacant-listings"
    dataKey="listings"
    title="Vacant Listings"
    subtitle="Vacant units available for marketplace publishing and approvals."
    searchPlaceholder="Search by listing, property, unit, location..."
    statusLabel="Vacancy Status"
    statusField="vacancyStatus"
    statusOptions={[
      { label: 'Vacant', value: 'vacant' },
      { label: 'Occupied', value: 'occupied' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Reserved', value: 'reserved' }
    ]}
    secondaryLabel="Publish Status"
    secondaryField="publishStatus"
    secondaryOptions={[
      { label: 'Published', value: 'Published' },
      { label: 'Unpublished', value: 'Unpublished' }
    ]}
    columns={[
      { key: 'listingTitle', label: 'Listing Title' },
      { key: 'landlord', label: 'Landlord' },
      { key: 'property', label: 'Property' },
      { key: 'unit', label: 'Unit' },
      { key: 'location', label: 'Location' },
      { key: 'rentPrice', label: 'Rent Price', type: 'currency' },
      { key: 'vacancyStatus', label: 'Vacancy Status' },
      { key: 'publishStatus', label: 'Publish Status' },
      { key: 'views', label: 'Views', type: 'number' },
      { key: 'unlocks', label: 'Unlocks', type: 'number' },
      { key: 'visits', label: 'Visits', type: 'number' },
      { key: 'createdDate', label: 'Created Date', type: 'date' }
    ]}
  />
);

export default SuperAdminVacantListings;
