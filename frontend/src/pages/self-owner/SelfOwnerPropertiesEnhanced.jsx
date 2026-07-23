import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Eye, Pencil, Plus, Search, Trash2, XCircle } from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';
import PropertyWizard from './PropertyWizard';

const blankProperty = () => ({
  name: '',
  location: '',
  propertyType: 'apartment',
  description: '',
  status: 'active',
  generalArea: '',
  googleMapsLocation: '',
  formattedAddress: '',
  placeId: '',
  latitude: '',
  longitude: '',
  locationVisibility: 'public',
  publishToMarketplace: true,
  showOnMap: true,
  exactLocationLocked: true,
  allowVisitBooking: true,
  allowContactReveal: true,
  address: { street: '', city: '', state: '', country: '', gps: { latitude: '', longitude: '' } },
  propertyImages: [],
  units: []
});
const asNumber = (value) => Number(value) || 0;
const stripPreview = (image = {}) => {
  const cleanImage = { ...image };
  delete cleanImage.preview;
  return cleanImage;
};
const belongsToProperty = (unit, propertyId) => String(unit?.property?._id || unit?.property || '') === String(propertyId || '');
const unitPayload = (unit) => ({
  unitNumber: String(unit?.unitNumber || '').trim(),
  rentAmount: asNumber(unit?.rentAmount),
  depositAmount: asNumber(unit?.depositAmount),
  description: String(unit?.description || '').trim(),
  bedrooms: asNumber(unit?.bedrooms) || 1,
  bathrooms: asNumber(unit?.bathrooms) || 1,
  area: unit?.area,
  status: unit?.status || 'vacant',
  images: (unit?.images || []).map(stripPreview)
});

const toWizardProperty = (property) => ({
  ...blankProperty(),
  ...property,
  address: {
    ...blankProperty().address,
    ...(property.address || {}),
    gps: {
      ...blankProperty().address.gps,
      ...(property.address?.gps || {}),
      latitude: property.latitude ?? property.address?.gps?.latitude ?? '',
      longitude: property.longitude ?? property.address?.gps?.longitude ?? ''
    }
  },
  latitude: property.latitude ?? property.address?.gps?.latitude ?? '',
  longitude: property.longitude ?? property.address?.gps?.longitude ?? '',
  propertyImages: (property.propertyImages || []).map((image, index) => ({ ...image, isMain: image.isMain || index === 0, preview: image.preview || (image.base64 ? `data:${image.contentType};base64,${image.base64}` : '') })),
  units: []
});

export default function SelfOwnerPropertiesEnhanced() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await api.get('/self-owner/properties', { params: { limit: 50, ...(status ? { status } : {}) } });
      const baseProperties = response.data?.properties || [];
      const propertiesWithExpectedRent = await Promise.all(baseProperties.map(async (property) => {
        try {
          const unitsResponse = await api.get(`/self-owner/properties/${property._id}/units`, { params: { limit: 100 } });
          const scopedUnits = (unitsResponse.data?.units || []).filter((unit) => belongsToProperty(unit, property._id));
          const totalUnits = scopedUnits.length;
          const occupiedUnits = scopedUnits.filter((unit) => unit.status === 'occupied' || unit.currentTenant).length;
          const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
          const expectedMonthlyRent = scopedUnits.reduce((total, unit) => total + asNumber(unit.rentAmount), 0);
          return { ...property, totalUnits, occupiedUnits, vacantUnits, expectedMonthlyRent };
        } catch {
          return {
            ...property,
            totalUnits: asNumber(property.totalUnits),
            occupiedUnits: asNumber(property.occupiedUnits),
            vacantUnits: asNumber(property.vacantUnits ?? (asNumber(property.totalUnits) - asNumber(property.occupiedUnits))),
            expectedMonthlyRent: asNumber(property.expectedMonthlyRent ?? property.monthlyIncome)
          };
        }
      }));
      setProperties(propertiesWithExpectedRent);
      setError('');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load properties.'); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadProperties(); }, [status]);

  const filtered = useMemo(() => properties.filter((property) => `${property.name} ${property.location}`.toLowerCase().includes(search.toLowerCase())), [properties, search]);
  const totals = useMemo(() => filtered.reduce((result, property) => ({ properties: result.properties + 1, units: result.units + asNumber(property.totalUnits), occupied: result.occupied + asNumber(property.occupiedUnits), vacant: result.vacant + asNumber(property.vacantUnits ?? Math.max(0, asNumber(property.totalUnits) - asNumber(property.occupiedUnits))), rent: result.rent + asNumber(property.expectedMonthlyRent ?? property.monthlyIncome) }), { properties: 0, units: 0, occupied: 0, vacant: 0, rent: 0 }), [filtered]);

  const openEdit = async (property) => {
    try {
      const response = await api.get(`/self-owner/properties/${property._id}/units`, { params: { limit: 100 } });
      const scopedUnits = (response.data?.units || []).filter((unit) => belongsToProperty(unit, property._id));
      setDialog({
       mode: 'edit',
       property: { ...toWizardProperty(property), units: scopedUnits },
       originalUnitIds: scopedUnits.filter((unit) => unit?._id).map((unit) => String(unit._id))
      });
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load the units for this property.'); }
  };
  const saveProperty = async (form) => {
    const payload = {
      ...form,
      location: form.location || form.address.city || form.address.street,
      latitude: form.latitude || form.address?.gps?.latitude || '',
      longitude: form.longitude || form.address?.gps?.longitude || '',
      address: {
        ...(form.address || {}),
        gps: {
          latitude: form.latitude || form.address?.gps?.latitude || '',
          longitude: form.longitude || form.address?.gps?.longitude || ''
        }
      },
      propertyImages: form.propertyImages.map(stripPreview)
    };
    try {
      if (dialog?.mode === 'edit') {
       await api.put(`/self-owner/properties/${dialog.property._id}`, payload);
       const currentUnits = form.units.filter((unit) => !unit._id || belongsToProperty(unit, dialog.property._id));
       const currentUnitIds = currentUnits.filter((unit) => unit?._id).map((unit) => String(unit._id));
       const originalUnitIds = dialog.originalUnitIds || [];
       const removedUnitIds = originalUnitIds.filter((id) => !currentUnitIds.includes(id));
       await Promise.all([
         ...currentUnits.map((unit) => unit._id
           ? api.put(`/self-owner/units/${unit._id}`, unitPayload(unit))
           : api.post('/self-owner/units', { ...unitPayload(unit), property: dialog.property._id })),
         ...removedUnitIds.map((unitId) => api.delete(`/self-owner/units/${unitId}`))
       ]);
      } else await api.post('/self-owner/properties', payload);
      setDialog(null);
      await loadProperties();
    } catch (requestError) {
      throw new Error(requestError.response?.data?.message || 'Unable to save property.', { cause: requestError });
    }
  };
  const deleteProperty = async (property) => {
    if (!window.confirm(`Delete ${property.name}?`)) return;
    try { await api.delete(`/self-owner/properties/${property._id}`); await loadProperties(); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to delete property.'); }
  };

  return <div className="mx-auto max-w-[1480px] space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Properties</h1><p className="mt-1 text-sm text-slate-500">Manage all your properties and their performance.</p></div><button type="button" onClick={() => setDialog({ mode: 'add', property: blankProperty() })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Add Property</button></header>
    {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={Building2} label="Total Properties" value={totals.properties} tone="blue" /><Stat icon={Building2} label="Total Units" value={totals.units} tone="violet" /><Stat icon={CheckCircle2} label="Occupied Units" value={totals.occupied} note={totals.units ? `${Math.round((totals.occupied / totals.units) * 100)}% Occupied` : 'No units yet'} tone="green" /><Stat icon={XCircle} label="Vacant Units" value={totals.vacant} note={totals.units ? `${Math.round((totals.vacant / totals.units) * 100)}% Vacant` : 'No units yet'} tone="amber" /></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><label className="relative min-w-0 flex-1 sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by property name or address..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="">All Statuses</option><option value="active">Active</option><option value="maintenance">Under Maintenance</option><option value="inactive">Inactive</option></select></div><div className="responsive-table"><table className="text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-5 py-4">Property</th><th className="px-5 py-4">Address</th><th className="px-5 py-4 text-center">Total Units</th><th className="px-5 py-4 text-center">Occupied</th><th className="px-5 py-4 text-center">Vacant</th><th className="px-5 py-4">Monthly Rent</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="8" className="px-5 py-10 text-center text-slate-500">Loading properties...</td></tr> : filtered.length ? filtered.map((property) => <PropertyRow key={property._id} property={property} onView={() => setSelected(property)} onEdit={() => openEdit(property)} onDelete={() => deleteProperty(property)} />) : <tr><td colSpan="8" className="px-5 py-10 text-center text-slate-500">No properties match your filters.</td></tr>}</tbody></table></div><div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">Showing {filtered.length} of {properties.length} properties</div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Total Monthly Rent" value={formatUGX(totals.rent)} /><Summary label="Occupied Units" value={`${totals.occupied}/${totals.units}`} /><Summary label="Vacant Units" value={`${totals.vacant}/${totals.units}`} /><Summary label="Properties" value={totals.properties} /></section>
    {dialog && <PropertyWizard initial={dialog.property} mode={dialog.mode} onClose={() => setDialog(null)} onSave={saveProperty} />}
    {selected && <PropertyView property={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function Stat({ icon: Icon, label, value, note, tone }) { const tones = { blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' }; return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className={`grid h-12 w-12 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-6 w-6" /></span><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>{note && <p className={`mt-1 text-xs font-semibold ${tone === 'green' ? 'text-emerald-600' : 'text-amber-600'}`}>{note}</p>}</div></div></article>; }
function Summary({ label, value }) { return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></article>; }
function PropertyRow({ property, onView, onEdit, onDelete }) { const vacant = asNumber(property.vacantUnits ?? Math.max(0, asNumber(property.totalUnits) - asNumber(property.occupiedUnits))); const expectedMonthlyRent = asNumber(property.expectedMonthlyRent ?? property.monthlyIncome); return <tr className="border-t border-slate-100 text-slate-700"><td className="px-5 py-3"><div className="flex items-center gap-3">{property.propertyImages?.[0]?.base64 ? <img src={`data:${property.propertyImages[0].contentType};base64,${property.propertyImages[0].base64}`} alt="" className="h-11 w-13 rounded-md object-cover" /> : <span className="grid h-11 w-12 place-items-center rounded-md bg-blue-50 text-blue-600"><Building2 className="h-5 w-5" /></span>}<div><p className="font-semibold text-slate-900">{property.name}</p><p className="text-xs text-slate-500">{property.propertyType || 'Property'}</p></div></div></td><td className="px-5 py-3 text-slate-600">{property.location || 'Not provided'}</td><td className="px-5 py-3 text-center">{asNumber(property.totalUnits)}</td><td className="px-5 py-3 text-center">{asNumber(property.occupiedUnits)}</td><td className="px-5 py-3 text-center">{vacant}</td><td className="px-5 py-3 font-medium">{formatUGX(expectedMonthlyRent)}</td><td className="px-5 py-3"><StatusBadge status={property.status} /></td><td className="px-5 py-3"><div className="flex justify-end gap-2"><Action label="View" onClick={onView}><Eye className="h-4 w-4" /></Action><Action label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></Action><Action label="Delete" onClick={onDelete} danger><Trash2 className="h-4 w-4" /></Action></div></td></tr>; }
function StatusBadge({ status }) { const label = status === 'maintenance' ? 'Under Maintenance' : status === 'inactive' ? 'Inactive' : 'Active'; const className = status === 'maintenance' ? 'border-amber-200 bg-amber-50 text-amber-700' : status === 'inactive' ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'; return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>; }
function Action({ children, label, onClick, danger = false }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-md border ${danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{children}</button>; }
function PropertyView({ property, onClose }) { const image = property.propertyImages?.find((item) => item.isMain) || property.propertyImages?.[0]; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section className="w-full max-w-xl rounded-xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 className="text-xl font-bold text-slate-900">{property.name}</h2><p className="mt-1 text-sm text-slate-500">{property.location || 'No address provided'}</p></div><button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close property view"><XCircle className="h-5 w-5" /></button></header>{image?.base64 && <img src={`data:${image.contentType};base64,${image.base64}`} alt={property.name} className="h-56 w-full object-cover" />}<div className="grid gap-4 p-5 sm:grid-cols-2"><Summary label="Property Type" value={property.propertyType || 'Not provided'} /><Summary label="Status" value={property.status || 'Active'} /><Summary label="Total Units" value={asNumber(property.totalUnits)} /><Summary label="Occupied Units" value={asNumber(property.occupiedUnits)} /><div className="sm:col-span-2"><p className="text-sm font-semibold text-slate-700">Description</p><p className="mt-1 text-sm leading-6 text-slate-600">{property.description || 'No description added.'}</p></div></div><footer className="flex justify-end border-t border-slate-200 p-4"><button type="button" onClick={onClose} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Close</button></footer></section></div>; }
