import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ImagePlus, Plus, Trash2, X } from 'lucide-react';

const STEPS = ['Details', 'Location & Map', 'Images', 'Units', 'Review'];
const PROPERTY_TYPES = [
  ['apartment', 'Apartment Building'], ['house', 'Residential House'],
  ['commercial', 'Commercial Building'], ['shops', 'Shops'], ['hostel', 'Hostel'],
  ['mixed_use', 'Mixed Use'], ['land', 'Land'], ['other', 'Other'],
];

const emptyUnit = () => ({ unitNumber: '', rentAmount: '', depositAmount: '', description: '', status: 'vacant', images: [] });
const LOCATION_VISIBILITY = [
  ['public', 'Public'],
  ['tenants_only', 'Tenants only'],
  ['private', 'Private'],
];
const stripPreview = (image = {}) => {
  const cleanImage = { ...image };
  delete cleanImage.preview;
  return cleanImage;
};

const compressImage = (file) => new Promise((resolve, reject) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    reject(new Error('Upload JPG, PNG, or WebP images only.'));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Unable to read that image.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Unable to prepare that image.'));
    image.onload = () => {
      const scale = Math.min(1, 1200 / image.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const preview = canvas.toDataURL('image/webp', 0.76);
      const base64 = preview.split(',')[1];
      if (base64.length > 360000) {
        reject(new Error('That image is still too large after compression. Choose a smaller image.'));
        return;
      }
      resolve({ base64, preview, contentType: 'image/webp', originalName: file.name, size: Math.round(base64.length * 0.75), isMain: false });
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

export default function PropertyWizard({ initial, mode = 'add', onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    ...initial,
    generalArea: initial.generalArea || '',
    googleMapsLocation: initial.googleMapsLocation || '',
    formattedAddress: initial.formattedAddress || initial.address?.formattedAddress || '',
    placeId: initial.placeId || initial.address?.placeId || '',
    latitude: initial.latitude ?? initial.address?.gps?.latitude ?? '',
    longitude: initial.longitude ?? initial.address?.gps?.longitude ?? '',
    locationVisibility: initial.locationVisibility || 'public',
    publishToMarketplace: initial.publishToMarketplace !== false,
    showOnMap: initial.showOnMap !== false,
    exactLocationLocked: initial.exactLocationLocked !== false,
    allowVisitBooking: initial.allowVisitBooking !== false,
    allowContactReveal: initial.allowContactReveal !== false,
    propertyImages: (initial.propertyImages || []).map((image) => ({
      ...image,
      preview: image.preview || (image.base64 ? `data:${image.contentType};base64,${image.base64}` : ''),
    })),
    units: (initial.units || []).map((unit) => ({
      ...unit,
      images: (unit.images || []).map((image) => ({
        ...image,
        preview: image.preview || (image.base64 ? `data:${image.contentType};base64,${image.base64}` : ''),
      })),
    })),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const monthlyRent = useMemo(() => form.units.reduce((sum, unit) => sum + (Number(unit.rentAmount) || 0), 0), [form.units]);
  const coverImage = form.propertyImages.find((image) => image.isMain) || form.propertyImages[0];

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateAddress = (key, value) => setForm((current) => ({ ...current, address: { ...current.address, [key]: value } }));
  const updateUnit = (index, key, value) => setForm((current) => ({ ...current, units: current.units.map((unit, unitIndex) => unitIndex === index ? { ...unit, [key]: value } : unit) }));

  const goNext = () => {
    if (step === 0 && !form.name.trim()) {
      setError('Property name is required before continuing.');
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (form.propertyImages.length + files.length > 3) {
      setError('A property can have up to three images.');
      return;
    }
    try {
      const images = await Promise.all(files.map(compressImage));
      setForm((current) => ({
        ...current,
        propertyImages: [...current.propertyImages, ...images].map((image, index) => ({ ...image, isMain: image.isMain || (!current.propertyImages.length && index === 0) })),
      }));
      setError('');
    } catch (imageError) { setError(imageError.message); }
  };

  const uploadUnitImages = async (unitIndex, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const existing = form.units[unitIndex]?.images || [];
    if (existing.length + files.length > 3) {
      setError('Each unit can have up to three images.');
      return;
    }
    try {
      const images = await Promise.all(files.map(compressImage));
      setForm((current) => ({
        ...current,
        units: current.units.map((unit, index) =>
          index === unitIndex
            ? { ...unit, images: [...(unit.images || []), ...images].map((image, imageIndex) => ({ ...image, isMain: image.isMain || imageIndex === 0 })) }
            : unit
        ),
      }));
      setError('');
    } catch (imageError) {
      setError(imageError.message);
    }
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        address: {
          ...(form.address || {}),
          formattedAddress: form.formattedAddress || '',
          placeId: form.placeId || '',
          gps: {
            latitude: form.latitude || '',
            longitude: form.longitude || '',
          },
        },
        units: (form.units || []).map((unit) => ({
          ...unit,
          images: (unit.images || []).map(stripPreview),
        })),
      });
    } catch (saveError) { setError(saveError.message || 'Unable to save property.'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="property-dialog-title">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-8">
          <div><h2 id="property-dialog-title" className="text-xl font-bold text-slate-900">{mode === 'edit' ? 'Edit Property' : 'Add Property'}</h2><p className="mt-1 text-sm text-slate-500">Complete the property profile, images, and units.</p></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </header>

        <nav className="grid grid-cols-5 border-b border-slate-200 px-3 py-4 sm:px-8" aria-label="Property form steps">
          {STEPS.map((label, index) => <button type="button" key={label} onClick={() => index <= step && setStep(index)} className={`relative grid place-items-center gap-1 text-center text-xs font-semibold sm:text-sm ${index === step ? 'text-blue-600' : index < step ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-full border ${index === step ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : index < step ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-white'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>
            <span>{label}</span>
          </button>)}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          {error && <p className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
          {step === 0 && <Details form={form} update={update} updateAddress={updateAddress} />}
          {step === 1 && <LocationMap form={form} update={update} />}
          {step === 2 && <Images images={form.propertyImages} coverImage={coverImage} onUpload={upload} onChange={(images) => update('propertyImages', images)} />}
          {step === 3 && <Units units={form.units} monthlyRent={monthlyRent} onAdd={() => update('units', [...form.units, emptyUnit()])} onUpdate={updateUnit} onRemove={(index) => update('units', form.units.filter((_, unitIndex) => unitIndex !== index))} onUploadUnitImages={uploadUnitImages} />}
          {step === 4 && <Review form={form} coverImage={coverImage} monthlyRent={monthlyRent} onEdit={setStep} />}
        </main>

        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-8">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <div className="flex gap-2"><button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 disabled:invisible"><ChevronLeft className="h-4 w-4" />Previous</button>{step < 4 ? <button type="button" onClick={goNext} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Next<ChevronRight className="h-4 w-4" /></button> : <button type="button" disabled={saving} onClick={submit} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save Property'}</button>}</div>
        </footer>
      </div>
    </div>
  );
}

function Details({ form, update, updateAddress }) { return <div className="grid gap-4 md:grid-cols-2"><Field label="Property Name" value={form.name} onChange={(value) => update('name', value)} required /><Select label="Property Type" value={form.propertyType} onChange={(value) => update('propertyType', value)} options={PROPERTY_TYPES} /><Field label="Address" value={form.location} onChange={(value) => update('location', value)} required /><Field label="City / Town" value={form.address?.city || ''} onChange={(value) => updateAddress('city', value)} /><Field label="District" value={form.address?.state || ''} onChange={(value) => updateAddress('state', value)} /><Field label="Country" value={form.address?.country || ''} onChange={(value) => updateAddress('country', value)} /><Select label="Status" value={form.status} onChange={(value) => update('status', value)} options={[['active', 'Active'], ['maintenance', 'Under Maintenance'], ['inactive', 'Inactive']]} /><label className="grid gap-1.5 md:col-span-2"><span className="text-sm font-semibold text-slate-700">Description</span><textarea value={form.description || ''} onChange={(event) => update('description', event.target.value)} placeholder="Describe the property, key features, or important notes..." className="min-h-32 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label></div>; }
function LocationMap({ form, update }) {
  return <div className="grid gap-4 md:grid-cols-2">
    <Field label="General Area / Neighborhood" value={form.generalArea || ''} onChange={(value) => update('generalArea', value)} />
    <Field label="Google Maps Location" value={form.googleMapsLocation || ''} onChange={(value) => update('googleMapsLocation', value)} />
    <Field label="Formatted Address" value={form.formattedAddress || ''} onChange={(value) => update('formattedAddress', value)} />
    <Field label="Google Place ID" value={form.placeId || ''} onChange={(value) => update('placeId', value)} />
    <Field label="Latitude" value={form.latitude || ''} onChange={(value) => update('latitude', value)} />
    <Field label="Longitude" value={form.longitude || ''} onChange={(value) => update('longitude', value)} />
    <Select label="Location Visibility" value={form.locationVisibility || 'public'} onChange={(value) => update('locationVisibility', value)} options={LOCATION_VISIBILITY} />
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <Toggle label="Publish to marketplace" checked={form.publishToMarketplace !== false} onChange={(value) => update('publishToMarketplace', value)} />
      <Toggle label="Show approximate map marker" checked={form.showOnMap !== false} onChange={(value) => update('showOnMap', value)} />
      <Toggle label="Lock exact location until unlock" checked={form.exactLocationLocked !== false} onChange={(value) => update('exactLocationLocked', value)} />
      <Toggle label="Allow visit booking" checked={form.allowVisitBooking !== false} onChange={(value) => update('allowVisitBooking', value)} />
      <Toggle label="Reveal contact after unlock" checked={form.allowContactReveal !== false} onChange={(value) => update('allowContactReveal', value)} />
    </div>
  </div>;
}
function Images({ images, coverImage, onUpload, onChange }) { return <div className="grid gap-6 lg:grid-cols-[1.05fr_1.5fr]"><div><p className="text-sm font-bold text-slate-900">Cover Preview</p><p className="mt-1 text-sm text-slate-500">This is the main image for the property.</p><div className="mt-4 aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">{coverImage?.preview ? <img src={coverImage.preview} alt="Property cover" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-slate-400">No image selected</div>}</div></div><div><div className="flex items-end justify-between"><div><p className="text-sm font-bold text-slate-900">Property Images ({images.length}/3)</p><p className="mt-1 text-sm text-slate-500">Choose a cover image, then add up to three images.</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <article key={`${image.originalName}-${index}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={image.preview} alt={image.originalName || `Property image ${index + 1}`} className="h-28 w-full object-cover" /><div className="p-2"><p className="truncate text-xs font-semibold text-slate-700">{image.originalName || `Image ${index + 1}`}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => onChange(images.map((item, imageIndex) => ({ ...item, isMain: imageIndex === index })))} className="text-xs font-semibold text-blue-600">{image.isMain ? 'Cover image' : 'Make cover'}</button><button type="button" onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index).map((item, imageIndex) => ({ ...item, isMain: item.isMain || imageIndex === 0 })))} className="text-xs font-semibold text-rose-600">Remove</button></div></div></article>)}{images.length < 3 && <label className="grid min-h-44 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/30 p-3 text-center text-blue-600 hover:bg-blue-50"><ImagePlus className="h-7 w-7" /><span className="mt-2 text-sm font-semibold">Upload image</span><span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onUpload} /></label>}</div><p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">Images are compressed before saving. Maximum 3 images.</p></div></div>; }
function Units({ units, monthlyRent, onAdd, onUpdate, onRemove, onUploadUnitImages }) {
  return <div>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="font-bold text-slate-900">Units / Rooms</h3>
        <p className="mt-1 text-sm text-slate-500">Add the units available at this property. You can add more later.</p>
      </div>
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Plus className="h-4 w-4" />Add unit</button>
    </div>
    {units.length ? <div className="space-y-3">{units.map((unit, index) => (
      <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1.25fr_1.25fr_1fr_auto]">
        <Field label="Unit number" value={unit.unitNumber} onChange={(value) => onUpdate(index, 'unitNumber', value)} />
        <Field label="Monthly rent (UGX)" type="number" value={unit.rentAmount} onChange={(value) => onUpdate(index, 'rentAmount', value)} />
        <Field label="Deposit (UGX)" type="number" value={unit.depositAmount} onChange={(value) => onUpdate(index, 'depositAmount', value)} />
        <Select label="Status" value={unit.status} onChange={(value) => onUpdate(index, 'status', value)} options={[['vacant', 'Vacant'], ['maintenance', 'Under Maintenance']]} />
        <button type="button" onClick={() => onRemove(index)} className="self-end rounded-md p-2 text-rose-600 hover:bg-rose-50" aria-label={`Remove unit ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
        <label className="grid gap-1.5 md:col-span-4">
          <span className="text-sm font-semibold text-slate-700">Unit description</span>
          <textarea value={unit.description || ''} onChange={(event) => onUpdate(index, 'description', event.target.value)} placeholder="For example: Two-bedroom unit with balcony and parking." className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
        </label>
        <div className="md:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Unit images ({(unit.images || []).length}/3)</p>
            <label className="cursor-pointer rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">Upload<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => onUploadUnitImages(index, event)} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(unit.images || []).map((image, imageIndex) => (
              <article key={`${index}-${imageIndex}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <img src={image.preview} alt={image.originalName || `Unit image ${imageIndex + 1}`} className="h-24 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <button type="button" onClick={() => onUpdate(index, 'images', (unit.images || []).map((item, itemIndex) => ({ ...item, isMain: itemIndex === imageIndex })))} className="text-xs font-semibold text-blue-600">{image.isMain ? 'Cover' : 'Make cover'}</button>
                  <button type="button" onClick={() => onUpdate(index, 'images', (unit.images || []).filter((_, itemIndex) => itemIndex !== imageIndex).map((item, itemIndex) => ({ ...item, isMain: item.isMain || itemIndex === 0 })))} className="text-xs font-semibold text-rose-600">Remove</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    ))}</div> : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">No units have been added yet.</div>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><Summary label="Total units" value={units.length} /><Summary label="Expected monthly rent" value={`UGX ${monthlyRent.toLocaleString()}`} /></div>
  </div>;
}
function Review({ form, coverImage, monthlyRent, onEdit }) { const type = PROPERTY_TYPES.find(([value]) => value === form.propertyType)?.[1] || 'Other'; return <div className="space-y-5"><div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ready to save</p><h3 className="mt-1 text-xl font-bold text-slate-900">{form.name || 'Untitled property'}</h3><p className="mt-1 text-sm text-slate-600">{form.location || 'No address provided'}</p></div>{coverImage?.preview && <img src={coverImage.preview} alt="Property cover" className="h-20 w-28 rounded-md object-cover" />}</div><div className="grid gap-4 sm:grid-cols-2"><ReviewBlock title="Property details" onEdit={() => onEdit(0)} rows={[["Type", type], ["Status", form.status === 'maintenance' ? 'Under Maintenance' : form.status || 'Active'], ["Description", form.description || 'No description added']]} /><ReviewBlock title="Location & map" onEdit={() => onEdit(1)} rows={[["General Area", form.generalArea || 'N/A'], ["Google Maps Location", form.googleMapsLocation || 'N/A'], ["Formatted Address", form.formattedAddress || 'N/A'], ["Latitude", form.latitude || 'N/A'], ["Longitude", form.longitude || 'N/A'], ["Marketplace", form.publishToMarketplace !== false ? 'Published' : 'Hidden'], ["Map", form.showOnMap !== false ? 'Approximate marker shown' : 'Not shown'], ["Contact Reveal", form.allowContactReveal !== false ? 'After unlock' : 'Disabled']]} /><ReviewBlock title="Images" onEdit={() => onEdit(2)} rows={[["Images added", `${form.propertyImages.length} of 3`], ["Cover image", coverImage?.originalName || 'Not selected']]} /><ReviewBlock title="Units & rent" onEdit={() => onEdit(3)} rows={[["Units added", form.units.length], ["Expected monthly rent", `UGX ${monthlyRent.toLocaleString()}`]]} /></div><p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">Review the information above. Saving only happens when you select the final save button.</p></div>; }
function ReviewBlock({ title, rows, onEdit }) { return <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h4 className="font-bold text-slate-900">{title}</h4><button type="button" onClick={onEdit} className="text-sm font-semibold text-blue-600">Edit</button></div><dl className="mt-3 space-y-2">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd></div>)}</dl></section>; }
function Summary({ label, value }) { return <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>; }
function Field({ label, value, onChange, type = 'text', required = false }) { return <label className="grid gap-1.5"><span className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</span><input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>; }
function Select({ label, value, onChange, options }) { return <label className="grid gap-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><select value={value || ''} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50">{options.map(([optionValue, optionLabel]) => <option key={optionLabel} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function Toggle({ label, checked, onChange }) { return <label className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></label>; }
