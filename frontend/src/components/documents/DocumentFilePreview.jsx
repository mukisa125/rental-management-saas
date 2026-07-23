import { FileText, Image as ImageIcon, FileType2, FileSearch, ExternalLink, Download, Printer } from 'lucide-react';
import { getDocumentName, getFileType, inferFileKind, safeText } from './documentUtils';

export default function DocumentFilePreview({ document, previewUrl, onOpenPreview, onOpen, onDownload, onPrint }) {
  if (!document) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
        <FileSearch className="mb-2 h-7 w-7" />
        <p className="text-sm font-medium">Select a document to preview</p>
        <p className="text-xs">Choose a row from the table to load file details.</p>
      </div>
    );
  }

  const kind = inferFileKind(document);
  const fileType = getFileType(document);

  if (kind === 'image' && previewUrl) {
    return (
      <button onClick={onOpenPreview} className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left">
        <img src={previewUrl} alt={safeText(getDocumentName(document))} className="h-56 w-full object-contain" />
        <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">Click to enlarge</p>
      </button>
    );
  }

  if (kind === 'pdf' && previewUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <iframe title={safeText(getDocumentName(document))} src={previewUrl} className="h-72 w-full" />
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-slate-600">
        <FileText className="h-8 w-8 text-rose-600" />
        <p className="text-sm font-semibold text-slate-800">PDF preview unavailable</p>
        <p className="text-xs text-slate-500">{safeText(getDocumentName(document))}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => onOpen?.(document)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" /> Open</button>
          <button onClick={() => onDownload?.(document)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> Download</button>
          <button onClick={() => onPrint?.(document)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50"><Printer className="h-3.5 w-3.5" /> Print</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
      {kind === 'word' ? <FileType2 className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
      <p className="text-sm font-semibold text-slate-700">Preview not available for {fileType}.</p>
      <p className="text-xs">You can still open or download this document.</p>
    </div>
  );
}
