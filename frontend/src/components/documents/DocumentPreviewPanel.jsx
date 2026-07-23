import { Download, Printer, RefreshCcw, Trash2, ExternalLink, FileSearch } from 'lucide-react';
import DocumentFilePreview from './DocumentFilePreview';
import DocumentStatusBadge from './DocumentStatusBadge';
import {
  formatDate,
  getDocumentCategory,
  getDocumentName,
  getDocumentStatus,
  getFileSize,
  getFileType,
  getPropertyUnitText,
  getRelatedText,
  getTenantName,
  safeDate,
  safeText
} from './documentUtils';

const Detail = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-sm font-medium text-slate-800">{safeText(value)}</p>
  </div>
);

export default function DocumentPreviewPanel({
  selectedDocument,
  previewUrl,
  onOpenPreview,
  onOpen,
  onDownload,
  onPrint,
  onReplace,
  onDelete
}) {
  const propertyUnit = getPropertyUnitText(selectedDocument);
  const created = formatDate(selectedDocument?.createdAt);
  const isPdf = getFileType(selectedDocument) === 'PDF';

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-slate-900">Document Preview</h3>
        {selectedDocument ? <DocumentStatusBadge status={getDocumentStatus(selectedDocument)} /> : null}
      </div>

      <DocumentFilePreview
        document={selectedDocument}
        previewUrl={previewUrl}
        onOpenPreview={onOpenPreview}
        onOpen={onOpen}
        onDownload={onDownload}
        onPrint={onPrint}
      />

      {!selectedDocument ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
          <FileSearch className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Select a document to preview</p>
          <p className="text-xs text-slate-500">Document details, metadata, and actions appear here.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <Detail label="Document Name" value={getDocumentName(selectedDocument)} />
            <Detail label="File Type" value={getFileType(selectedDocument)} />
            <Detail label="Category" value={getDocumentCategory(selectedDocument)} />
            <Detail label="Related To" value={getRelatedText(selectedDocument)} />
            <Detail label="Property / Unit" value={`${propertyUnit.propertyName}${propertyUnit.unitLabel !== '-' ? ` | ${propertyUnit.unitLabel}` : ''}`} />
            <Detail label="Tenant" value={getTenantName(selectedDocument)} />
            <Detail label="Source" value={safeText(selectedDocument.sourceModule, 'Manual Upload')} />
            <Detail label="Status" value={getDocumentStatus(selectedDocument)} />
            <Detail label="Created" value={`${created.date} ${created.time}`} />
            <Detail label="File Size" value={getFileSize(selectedDocument)} />
            <Detail label="Expiry Date" value={safeDate(selectedDocument.expiryDate, '-')} />
            <Detail label="Notes" value={safeText(selectedDocument.notes, 'No notes')} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={() => onOpen(selectedDocument)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" /> Open
            </button>
            <button onClick={() => onDownload(selectedDocument)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Download
            </button>
            {isPdf ? (
              <button onClick={() => onPrint(selectedDocument)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Printer className="h-4 w-4" /> Print
              </button>
            ) : null}
            <button onClick={() => onReplace(selectedDocument)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCcw className="h-4 w-4" /> Replace
            </button>
            <button onClick={() => onDelete(selectedDocument)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 sm:col-span-2">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
