import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, ClipboardList, FileText, Home, Mail, MapPin, Phone, ReceiptText, ShieldCheck, Wrench } from 'lucide-react';
import { tenantPortalAPI } from '../../services/api';
import {
  dateLabel,
  daysUntil,
  EmptyTenantState,
  FieldRow,
  formatUGX,
  PageHeader,
  QuickActionCard,
  resolveImage,
  safeNumber,
  safeText,
  TenantErrorState,
  TenantLoadingState,
  TenantPanel,
  TenantStatusBadge
} from './TenantPortalUI';

export default function TenantMyRental() {
  const [rentalInfo, setRentalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchRentalInfo = async () => {
      try {
        setLoading(true);
        const response = await tenantPortalAPI.getRentalInfo();
        if (!cancelled) {
          setRentalInfo(response.data || null);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.message || 'Unable to load your property details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRentalInfo();
    return () => {
      cancelled = true;
    };
  }, []);

  const property = rentalInfo?.property || {};
  const unit = rentalInfo?.unit || {};
  const owner = rentalInfo?.owner || {};
  const propertyImage = useMemo(() => {
    const image = property.propertyImages?.find((item) => item.isMain) || property.propertyImages?.[0] || property.images?.[0] || property.image;
    return resolveImage(image);
  }, [property]);
  const leaseDays = daysUntil(rentalInfo?.leaseEnd);
  const propertyRulesNotice = safeText(
    rentalInfo?.propertyRulesNotice || property.description || unit.description,
    'Property rules and unit notes will appear here when your landlord shares them.'
  );

  if (loading) return <TenantLoadingState message="Loading your property..." />;
  if (error) return <TenantErrorState message={error} />;
  if (!rentalInfo) return <EmptyTenantState title="No rental information found" description="Your tenant profile is not linked yet. Please contact your landlord." />;

  const amenities = Array.isArray(unit.amenities) && unit.amenities.length
    ? unit.amenities
    : Array.isArray(property.amenities)
      ? property.amenities
      : [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="My Property" subtitle="View details about your rented property and unit." />

      <TenantPanel>
        <div className="grid gap-6 p-5 lg:grid-cols-[340px_1fr]">
          <div className="overflow-hidden rounded-xl bg-slate-100">
            {propertyImage ? (
              <img src={propertyImage} alt={safeText(property.name, 'Property')} className="h-72 w-full object-cover lg:h-full" />
            ) : (
              <div className="grid h-72 place-items-center bg-blue-50 text-blue-600 lg:h-full">
                <Building2 className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{safeText(property.name, 'Assigned property')}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {safeText(property.location || property.address?.city || property.address?.street, 'Address not provided')}
                </p>
              </div>
              <TenantStatusBadge status={property.status || rentalInfo.status || 'active'} />
            </div>

            <dl className="mt-2 grid gap-x-10 sm:grid-cols-2">
              <FieldRow label="Unit" value={safeText(unit.unitNumber)} />
              <FieldRow label="Unit Type" value={unit.bedrooms ? `${unit.bedrooms} Bedroom Apartment` : safeText(property.propertyType, 'Unit')} />
              <FieldRow label="Monthly Rent" value={formatUGX(rentalInfo.rentAmount || unit.rentAmount)} />
              <FieldRow label="Security Deposit" value={formatUGX(rentalInfo.securityDeposit || unit.depositAmount)} />
              <FieldRow label="Lease Start Date" value={dateLabel(rentalInfo.leaseStart)} />
              <FieldRow label="Lease End Date" value={dateLabel(rentalInfo.leaseEnd)} />
              <FieldRow label="Lease Status" value={leaseDays > 0 ? `${leaseDays} days remaining` : 'Lease expired'} valueClassName={leaseDays > 30 ? 'text-emerald-600' : 'text-amber-600'} />
              <FieldRow label="Outstanding Balance" value={formatUGX(rentalInfo.outstandingBalance)} valueClassName={safeNumber(rentalInfo.outstandingBalance) ? 'text-rose-600' : 'text-emerald-600'} />
            </dl>
          </div>
        </div>
      </TenantPanel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard icon={ReceiptText} title="View Lease" subtitle="View your lease agreement" to="/tenant/documents" />
        <QuickActionCard icon={ClipboardList} title="Property Rules" subtitle="Read property rules" to="/tenant/notices" />
        <QuickActionCard icon={Phone} title="Landlord Contact" subtitle="Contact property owner" to="/tenant/my-property#landlord-contact" />
        <QuickActionCard icon={AlertTriangle} title="Report Issue" subtitle="Report a property issue" to="/tenant/maintenance" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <TenantPanel title="Unit Details">
          <dl className="px-5 py-3">
            <FieldRow label="Bedrooms" value={safeNumber(unit.bedrooms)} />
            <FieldRow label="Bathrooms" value={safeNumber(unit.bathrooms)} />
            <FieldRow label="Area" value={unit.area ? `${unit.area} sq ft` : 'N/A'} />
            <FieldRow label="Unit Status" value={<TenantStatusBadge status={unit.status || 'occupied'} />} />
          </dl>
        </TenantPanel>

        <TenantPanel title="Landlord Contact" className="scroll-mt-24" action={<span id="landlord-contact" />}>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                <Home className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">{safeText(owner.name, 'Landlord')}</p>
                <p className="text-xs font-medium text-slate-500">{safeText(owner.companyName, 'Property owner')}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href={`mailto:${owner.email || ''}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
                {safeText(owner.email)}
              </a>
              <a href={`tel:${owner.phone || ''}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50">
                <Phone className="h-4 w-4 text-blue-600" />
                {safeText(owner.phone)}
              </a>
            </div>
          </div>
        </TenantPanel>
      </section>

      <TenantPanel title="Amenities and Rules">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Amenities
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {amenities.length ? amenities.map((item, index) => (
                <span key={`${item.name || item}-${index}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {safeText(item.name || item)}
                </span>
              )) : <p className="text-sm font-medium text-slate-500">No amenities have been added yet.</p>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
              <FileText className="h-4 w-4 text-blue-600" />
              Property Rules
            </h3>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
              {propertyRulesNotice}
            </p>
            <Link to="/tenant/notices" className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-600 hover:bg-blue-50">
              View Notices
            </Link>
          </div>
        </div>
      </TenantPanel>
    </div>
  );
}
