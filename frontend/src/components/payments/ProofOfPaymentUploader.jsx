import { useMemo, useRef, useState } from 'react';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { fileSizeLabel } from './paymentUtils';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_SIZE = 2 * 1024 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('We could not read that file.'));
  reader.readAsDataURL(file);
});

const compressImage = async (file) => {
  const original = await readAsDataUrl(file);
  const image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = original; });
  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > 1600 ? 1600 / largestSide : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  context?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/webp', 0.78);
  const base64 = dataUrl.split(',')[1] || '';
  return { base64, contentType: 'image/webp', size: Math.round((base64.length * 3) / 4) };
};

const ProofOfPaymentUploader = ({ value, onChange, disabled = false }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const preview = useMemo(() => value?.base64 && String(value.contentType).startsWith('image/') ? `data:${value.contentType};base64,${value.base64}` : '', [value]);

  const selectFile = async (file) => {
    setError('');
    if (!file) return;
    if (!allowedTypes.has(file.type)) { setError('Use a JPG, PNG, WEBP, or PDF file.'); return; }
    if (file.size > MAX_SIZE * 4) { setError('Choose a file smaller than 8MB so it can be compressed safely.'); return; }
    try {
      const encoded = file.type.startsWith('image/') ? await compressImage(file) : { base64: (await readAsDataUrl(file)).split(',')[1] || '', contentType: file.type, size: file.size };
      if (!encoded.base64 || encoded.size > MAX_SIZE) { setError('The compressed file is still larger than 2MB. Please choose a smaller file.'); return; }
      onChange({ base64: encoded.base64, contentType: encoded.contentType, originalName: file.name || 'proof-of-payment', size: encoded.size });
    } catch {
      setError('We could not prepare that file. Please try another one.');
    }
  };

  return (
    <div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={disabled} onChange={(event) => selectFile(event.target.files?.[0])} />
      {value?.base64 ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          {preview ? <img src={preview} alt="Proof of payment preview" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><FileText className="h-5 w-5" /></div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">{value.originalName || 'Proof of payment'}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{fileSizeLabel(value.size)} · {value.contentType === 'application/pdf' ? 'PDF' : 'Image'}</p>
          </div>
          <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="rounded-lg px-2 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">Replace</button>
          <button type="button" disabled={disabled} onClick={() => onChange(null)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Remove proof"><Trash2 className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60">
          <span className="mb-2 rounded-full bg-white p-2 text-blue-600 shadow-sm"><UploadCloud className="h-5 w-5" /></span>
          <span className="text-sm font-bold text-slate-700">Click to upload or drag & drop</span>
          <span className="mt-1 text-xs font-medium text-slate-500">JPG, PNG, WEBP, or PDF up to 2MB</span>
        </button>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
};

export default ProofOfPaymentUploader;
