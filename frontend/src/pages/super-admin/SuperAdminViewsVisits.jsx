import SuperAdminTablePage from '../../components/super-admin/SuperAdminTablePage';

const SuperAdminViewsVisits = () => (
  <SuperAdminTablePage
    endpoint="/super-admin/views-visits"
    dataKey="viewsVisits"
    title="Views & Visits"
    subtitle="Track seeker listing views, unlocks, and visit booking actions."
    searchPlaceholder="Search seeker, listing, or landlord..."
    statusLabel="Action Type"
    statusField="actionType"
    statusOptions={[
      { label: 'Search', value: 'search' },
      { label: 'View Listing Summary', value: 'view_listing_summary' },
      { label: 'Unlock Full Details', value: 'unlock_full_details' },
      { label: 'Reveal Map Location', value: 'reveal_map_location' },
      { label: 'Reveal Landlord Contact', value: 'reveal_landlord_contact' },
      { label: 'Book Visit', value: 'book_visit' }
    ]}
    secondaryLabel="Visit Status"
    secondaryField="visitStatus"
    secondaryOptions={[
      { label: 'Booked', value: 'Booked' },
      { label: 'N/A', value: 'N/A' }
    ]}
    columns={[
      { key: 'seeker', label: 'Seeker' },
      { key: 'listing', label: 'Listing' },
      { key: 'landlord', label: 'Landlord' },
      { key: 'actionType', label: 'Action Type' },
      { key: 'amountCharged', label: 'Amount Charged', type: 'currency' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'dateTime', label: 'Date/Time', type: 'date' },
      { key: 'visitDate', label: 'Visit Date', type: 'date' },
      { key: 'visitStatus', label: 'Visit Status' }
    ]}
  />
);

export default SuperAdminViewsVisits;
