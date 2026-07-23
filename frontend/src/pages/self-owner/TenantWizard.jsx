import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, FileText, ImagePlus, Trash2, Upload, X } from 'lucide-react';

const steps = ['Personal Details', 'Identity Attachments', 'Tenant Account', 'Review & Save'];
const empty = {
  fullName: '',
  phone: '',
  email: '',
  idNumber: '',
  gender: '',
  dateOfBirth: '',
  occupation: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  property: '',
  unit: '',
  leaseStart: '',
  leaseEnd: '',
  rentAmount: '',
  securityDeposit: '',
  status: 'active',
  notes: '',
  photo: null,
  attachments: {},
  hasAccount: false,
  createAccount: false,
  accountEmail: '',
  accountPassword: '',
  confirmPassword: ''
};
const accepted = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const getId = (value) => String(value?._id || value || '');
const attachmentImageSrc = (attachment) => {
  if (!attachment) return '';
  if (attachment.preview) return attachment.preview;
  if (!String(attachment.contentType || '').startsWith('image/') || !attachment.base64) return '';
  return String(attachment.base64).startsWith('data:')
    ? attachment.base64
    : `data:${attachment.contentType || 'image/webp'};base64,${attachment.base64}`;
};
const fileToAttachment = (file) => new Promise((resolve, reject) => {
  if (!accepted.includes(file.type)) return reject(new Error('Use JPG, PNG, WEBP, or PDF files only.'));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Unable to read the selected file.'));
  reader.onload = () => {
    if (file.type === 'application/pdf') {
      const base64 = String(reader.result).split(',')[1];
      if (base64.length > 360000) return reject(new Error('PDF is too large. Choose a file under 250KB.'));
      return resolve({ base64, contentType: file.type, originalName: file.name, size: file.size, preview: '' });
    }
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1000 / image.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const preview = canvas.toDataURL('image/webp', 0.72);
      const base64 = preview.split(',')[1];
      if (base64.length > 360000) return reject(new Error('Image is too large after compression.'));
      resolve({ base64, contentType: 'image/webp', originalName: file.name, size: Math.round(base64.length * 0.75), preview });
    };
    image.onerror = () => reject(new Error('Unable to prepare the image.'));
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

export default function TenantWizard({
  properties,
  units,
  onClose,
  onSave,
  initialForm = {},
  allocationLocked = false,
  page = false,
  title = 'Add Tenant',
  description = 'Complete the tenant profile, attachments, account, and review before saving.',
  submitLabel = 'Save Tenant',
  showStatus = false
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({
    ...empty,
    ...initialForm,
    attachments: { ...empty.attachments, ...(initialForm.attachments || {}) }
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const propertyUnits = useMemo(() => units.filter((unit) => {
    const sameProperty = getId(unit.property) === form.property || getId(unit.property?._id) === form.property;
    const selectedUnit = getId(unit._id) === form.unit;
    return sameProperty && (unit.status !== 'occupied' || selectedUnit);
  }), [units, form.property, form.unit]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const fields = ['fullName', 'phone', 'idNumber', 'property', 'unit', 'leaseStart', 'leaseEnd', 'rentAmount'];
    if (fields.some((field) => !form[field])) return 'Complete all required fields before continuing.';
    if (new Date(form.leaseEnd) <= new Date(form.leaseStart)) return 'Lease end date must be after the start date.';
    return '';
  };
  const next = () => {
    const message = step === 0
      ? validate()
      : step === 2 && form.createAccount
        ? (!form.accountEmail || form.accountPassword.length < 6
          ? 'Enter an account email and a password of at least six characters.'
          : form.accountPassword !== form.confirmPassword
            ? 'The account passwords do not match.'
            : '')
        : '';
    if (message) return setError(message);
    setError('');
    setStep((value) => Math.min(3, value + 1));
  };
  const choose = async (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const attachment = await fileToAttachment(file);
      if (key === 'photo') update('photo', attachment);
      else setForm((current) => ({ ...current, attachments: { ...current.attachments, [key]: attachment } }));
      setError('');
    } catch (fileError) {
      setError(fileError.message);
    }
  };
  const removeAttachment = (key) => setForm((current) => {
    const nextAttachments = { ...current.attachments };
    delete nextAttachments[key];
    return { ...current, attachments: nextAttachments };
  });
  const submit = async () => {
    const message = validate();
    if (message) {
      setError(message);
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        attachments: Object.fromEntries(Object.entries(form.attachments).map(([key, value]) => [key, withoutPreview(value)])),
        photo: withoutPreview(form.photo)
      });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save tenant.');
    } finally {
      setSaving(false);
    }
  };

  const wizard = (
    <section className={`flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ${page ? 'min-h-[min(860px,calc(100vh-3rem))]' : 'max-h-[94vh]'}`}>
      <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        )}
      </header>
      <nav className="grid grid-cols-4 border-b border-slate-200 px-3 py-4 sm:px-8">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            onClick={() => index <= step && setStep(index)}
            className={`grid place-items-center gap-1 text-center text-xs font-semibold sm:text-sm ${index === step ? 'text-blue-600' : index < step ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <span className={`grid h-8 w-8 place-items-center rounded-full border ${index === step ? 'border-blue-600 bg-blue-600 text-white' : index < step ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-300'}`}>
              {index < step ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            {label}
          </button>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
        {error && <p className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {step === 0 && (
          <Personal
            form={form}
            update={update}
            properties={properties}
            propertyUnits={propertyUnits}
            choose={choose}
            allocationLocked={allocationLocked}
            showStatus={showStatus}
          />
        )}
        {step === 1 && <Attachments attachments={form.attachments} choose={choose} remove={removeAttachment} />}
        {step === 2 && <Account form={form} update={update} />}
        {step === 3 && <Review form={form} properties={properties} units={units} showStatus={showStatus} />}
      </main>
      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-8">
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
        ) : <span />}
        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((value) => value - 1)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
              <ChevronLeft className="h-4 w-4" />Previous
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Next<ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={saving} onClick={submit} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : submitLabel}
            </button>
          )}
        </div>
      </footer>
    </section>
  );

  return page
    ? <div className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6 sm:py-10"><div className="mx-auto max-w-6xl">{wizard}</div></div>
    : <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">{wizard}</div>;
}

function Personal({ form, update, properties, propertyUnits, choose, allocationLocked, showStatus }) {
  const photoSrc = attachmentImageSrc(form.photo);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <label className="grid min-h-36 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-3 text-center text-blue-600 md:row-span-2">
        {photoSrc ? (
          <img src={photoSrc} className="h-24 w-24 rounded-full object-cover" alt="Tenant" />
        ) : (
          <>
            <ImagePlus className="h-7 w-7" />
            <span className="mt-2 text-sm font-semibold">Upload Photo</span>
            <span className="text-xs text-slate-500">JPG, PNG up to 2MB</span>
          </>
        )}
        <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose('photo', event)} />
      </label>
      <Field label="Full Name" required value={form.fullName} onChange={(value) => update('fullName', value)} />
      <Field label="Phone Number" required value={form.phone} onChange={(value) => update('phone', value)} />
      <Field label="Email Address" type="email" value={form.email} onChange={(value) => update('email', value)} />
      <Field label="National ID / Passport" required value={form.idNumber} onChange={(value) => update('idNumber', value)} />
      <Select label="Gender" value={form.gender} onChange={(value) => update('gender', value)} options={[['', 'Select gender'], ['male', 'Male'], ['female', 'Female'], ['other', 'Other']]} />
      <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} />
      <Field label="Occupation" value={form.occupation} onChange={(value) => update('occupation', value)} />
      <Field label="Emergency Contact Name" value={form.emergencyContactName} onChange={(value) => update('emergencyContactName', value)} />
      <Field label="Emergency Contact Phone" value={form.emergencyContactPhone} onChange={(value) => update('emergencyContactPhone', value)} />
      <Select
        label="Property"
        required
        value={form.property}
        onChange={(value) => {
          update('property', value);
          update('unit', '');
        }}
        options={[['', 'Select property'], ...properties.map((property) => [property._id, property.name])]}
        disabled={allocationLocked}
      />
      <Select
        label="Unit"
        required
        value={form.unit}
        onChange={(value) => {
          update('unit', value);
          const unit = propertyUnits.find((item) => item._id === value);
          if (unit) update('rentAmount', unit.rentAmount || '');
        }}
        options={[['', 'Select unit'], ...propertyUnits.map((unit) => [unit._id, unit.unitNumber])]}
        disabled={allocationLocked}
      />
      <Field label="Lease Start Date" type="date" required value={form.leaseStart} onChange={(value) => update('leaseStart', value)} />
      <Field label="Lease End Date" type="date" required value={form.leaseEnd} onChange={(value) => update('leaseEnd', value)} />
      <Field label="Monthly Rent (UGX)" type="number" required value={form.rentAmount} onChange={(value) => update('rentAmount', value)} />
      <Field label="Security Deposit (UGX)" type="number" value={form.securityDeposit} onChange={(value) => update('securityDeposit', value)} />
      {showStatus && (
        <Select
          label="Status"
          value={form.status}
          onChange={(value) => update('status', value)}
          options={[['active', 'Active'], ['inactive', 'Inactive'], ['pending', 'Pending'], ['terminated', 'Evicted'], ['renewed', 'Renewed']]}
        />
      )}
      <label className="grid gap-1.5 md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">Notes / Additional Details</span>
        <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="min-h-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
      </label>
    </div>
  );
}

function Account({ form, update }) {
  if (form.hasAccount) {
    return (
      <div className="mx-auto max-w-2xl">
        <h3 className="text-lg font-bold text-slate-900">Tenant Login Account</h3>
        <p className="mt-1 text-sm text-slate-500">This tenant already has a linked portal account.</p>
        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Account linked</p>
          <p className="mt-1 text-sm text-emerald-700">{form.accountEmail || form.email || 'No account email saved'}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h3 className="text-lg font-bold text-slate-900">Tenant Login Account</h3>
      <p className="mt-1 text-sm text-slate-500">Create credentials for this tenant to access only their allocated rental, payments, maintenance, and documents.</p>
      <label className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <input type="checkbox" checked={form.createAccount} onChange={(event) => update('createAccount', event.target.checked)} className="h-4 w-4 accent-blue-600" />
        <span>
          <span className="block text-sm font-semibold text-slate-800">Create tenant account</span>
          <span className="block text-xs text-slate-500">The account is linked to the selected property and unit.</span>
        </span>
      </label>
      {form.createAccount && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Account Email" type="email" value={form.accountEmail || form.email} onChange={(value) => update('accountEmail', value)} required />
          <Field label="Password" type="password" value={form.accountPassword} onChange={(value) => update('accountPassword', value)} required />
          <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={(value) => update('confirmPassword', value)} required />
        </div>
      )}
    </div>
  );
}

function Attachments({ attachments, choose, remove }) {
  const files = [['national_id_front', 'National ID Front'], ['national_id_back', 'National ID Back'], ['lc_letter', 'LC Letter / Recommendation']];

  return (
    <div>
      <h3 className="font-bold text-slate-900">Identity Attachments</h3>
      <p className="mt-1 text-sm text-slate-500">Add JPG, PNG, WEBP, or PDF files. Images are compressed before saving.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {files.map(([key, label]) => (
          <Attachment key={key} label={label} attachment={attachments[key]} choose={(event) => choose(key, event)} remove={() => remove(key)} />
        ))}
      </div>
    </div>
  );
}

function Attachment({ label, attachment, choose, remove }) {
  const imageSrc = attachmentImageSrc(attachment);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {attachment ? (
        <>
          <div className="grid h-32 place-items-center overflow-hidden rounded-lg bg-white">
            {imageSrc ? <img src={imageSrc} alt={label} className="h-full w-full object-cover" /> : <FileText className="h-9 w-9 text-rose-500" />}
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-slate-800">{attachment.originalName || label}</p>
          <p className="text-xs text-slate-500">{Math.max(1, Math.round((attachment.size || 0) / 1024))} KB</p>
          <button type="button" onClick={remove} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-600">
            <Trash2 className="h-4 w-4" />Remove
          </button>
        </>
      ) : (
        <label className="grid h-48 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-blue-300 bg-white p-4 text-center text-blue-600">
          <Upload className="h-7 w-7" />
          <span className="mt-2 text-sm font-semibold">Upload {label}</span>
          <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, PDF</span>
          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={choose} />
        </label>
      )}
    </article>
  );
}

function Review({ form, properties, units, showStatus }) {
  const property = properties.find((item) => item._id === form.property);
  const unit = units.find((item) => item._id === form.unit);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ReviewBox title="Personal Details" rows={[
        ['Name', form.fullName],
        ['Phone', form.phone],
        ['Email', form.email || 'Not provided'],
        ['ID', form.idNumber],
        ['Gender', formatGender(form.gender)],
        ['Date of birth', form.dateOfBirth || 'Not provided'],
        ['Occupation', form.occupation || 'Not provided'],
        ['Emergency contact', [form.emergencyContactName, form.emergencyContactPhone].filter(Boolean).join(' - ') || 'Not provided'],
        ...(showStatus ? [['Status', formatStatus(form.status)]] : [])
      ]} />
      <ReviewBox title="Lease Details" rows={[
        ['Property', property?.name || 'Not selected'],
        ['Unit', unit?.unitNumber || 'Not selected'],
        ['Lease', `${form.leaseStart || '-'} to ${form.leaseEnd || '-'}`],
        ['Monthly rent', `UGX ${Number(form.rentAmount || 0).toLocaleString()}`],
        ['Security deposit', `UGX ${Number(form.securityDeposit || 0).toLocaleString()}`]
      ]} />
      <ReviewBox title="Identity Attachments" rows={[
        ['Tenant photo', form.photo?.originalName || (form.photo?.base64 ? 'Saved photo' : 'Not added')],
        ['National ID front', form.attachments.national_id_front?.originalName || 'Not added'],
        ['National ID back', form.attachments.national_id_back?.originalName || 'Not added'],
        ['LC letter', form.attachments.lc_letter?.originalName || 'Not added']
      ]} />
      <ReviewBox title="Tenant Account" rows={[
        ['Portal access', form.hasAccount ? 'Account linked' : form.createAccount ? 'Create account' : 'No account'],
        ['Account email', form.accountEmail || form.email || 'Not provided'],
        ['Notes', form.notes || 'Not provided']
      ]} />
    </div>
  );
}

function ReviewBox({ title, rows }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
    </label>
  );
}

function Select({ label, value, onChange, options, required = false, disabled = false }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100">
        {options.map(([optionValue, optionLabel]) => <option key={`${optionValue}-${optionLabel}`} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function formatGender(value) {
  const labels = { male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say' };
  return labels[value] || 'Not provided';
}

function formatStatus(value) {
  const labels = { active: 'Active', inactive: 'Inactive', pending: 'Pending', terminated: 'Evicted', renewed: 'Renewed' };
  return labels[value] || value || 'Active';
}

function withoutPreview(attachment) {
  if (!attachment) return undefined;
  const stored = { ...attachment };
  delete stored.preview;
  return stored;
}
