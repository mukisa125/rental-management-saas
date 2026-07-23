import { useEffect, useMemo, useState } from 'react';
import { Bell, Download, Eye, FileArchive, FileText, Folder, Paperclip, ReceiptText } from 'lucide-react';
import { tenantPortalAPI } from '../../services/api';
import {
  dateTimeLabel,
  EmptyTenantState,
  fileSizeLabel,
  PageHeader,
  safeText,
  TenantErrorState,
  TenantLoadingState,
  TenantPanel,
  TenantStatCard,
  TenantStatusBadge
} from './TenantPortalUI';

const tabs = [
  { value: 'all', label: 'All', icon: Folder },
  { value: 'lease', label: 'Lease Agreements', icon: FileText },
  { value: 'receipt', label: 'Receipts', icon: ReceiptText },
  { value: 'notice', label: 'Notices', icon: Bell },
  { value: 'attachment', label: 'Attachments', icon: Paperclip }
];

const typeLabel = (doc) => safeText(doc.documentType || doc.category, 'Attachment').replace(/_/g, ' ');

export default function TenantDocuments() {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await tenantPortalAPI.getDocuments();
        const list = Array.isArray(response.data) ? response.data : [];
        if (!cancelled) {
          setDocuments(list);
          setSelected(list[0] || null);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.message || 'Unable to load documents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDocuments();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => documents.filter((doc) => activeTab === 'all' || doc.documentType === activeTab || String(doc.category || '').toLowerCase().includes(activeTab)), [activeTab, documents]);
  const counts = useMemo(() => ({
    total: documents.length,
    lease: documents.filter((doc) => doc.documentType === 'lease' || String(doc.category || '').toLowerCase().includes('lease')).length,
    receipt: documents.filter((doc) => doc.documentType === 'receipt' || String(doc.category || '').toLowerCase().includes('receipt')).length,
    notice: documents.filter((doc) => doc.documentType === 'notice').length
  }), [documents]);

  const handleDownload = async (docItem) => {
    try {
      if (docItem?.canDownload === false) {
        setError('Download is disabled by your landlord settings.');
        return;
      }
      if (docItem?.fileUrl) {
        window.open(docItem.fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const response = await tenantPortalAPI.downloadDocument(docItem._id);
      const contentType = String(response?.headers?.['content-type'] || docItem.mimeType || 'application/octet-stream');
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const parsed = JSON.parse(text || '{}');
        if (parsed?.fileUrl) {
          window.open(parsed.fileUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = docItem.fileName || docItem.title || 'document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to download document.');
    }
  };

  if (loading) return <TenantLoadingState message="Loading documents..." />;
  if (error && !documents.length) return <TenantErrorState message={error} />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="My Documents" subtitle="View and download your lease agreements, notices, receipts, and attachments." />

      {error && <TenantErrorState message={error} />}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <TenantStatCard icon={FileText} label="Total Documents" value={counts.total} note="All time" tone="blue" />
        <TenantStatCard icon={FileText} label="Lease Files" value={counts.lease} note="Lease agreements" tone="green" />
        <TenantStatCard icon={ReceiptText} label="Receipts" value={counts.receipt} note="Payment receipts" tone="violet" />
        <TenantStatCard icon={Bell} label="Notices" value={counts.notice} note="Important notices" tone="amber" />
      </section>

      <TenantPanel>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${activeTab === tab.value ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 p-4 xl:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {filtered.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Document</th>
                      <th className="px-5 py-4">Uploaded</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Size</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((doc) => (
                      <tr key={doc._id} className={selected?._id === doc._id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-blue-600">
                              <FileArchive className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900">{safeText(doc.title || doc.fileName, 'Document')}</p>
                              <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">{safeText(doc.description, 'Tenant document')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-600">{dateTimeLabel(doc.generatedAt || doc.createdAt)}</td>
                        <td className="px-5 py-4"><TenantStatusBadge status={typeLabel(doc)} /></td>
                        <td className="px-5 py-4 font-semibold text-slate-600">{fileSizeLabel(doc.size)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setSelected(doc)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50" aria-label="View document">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDownload(doc)} disabled={doc.canDownload === false} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50" aria-label="Download document">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5"><EmptyTenantState title="No documents found" description="Documents shared by your landlord will appear here." /></div>
            )}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-slate-950">Document Preview</h2>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">{safeText(selected.category, 'Tenant Document')}</p>
                      <p className="mt-3 text-lg font-black text-slate-950">{safeText(selected.title || selected.fileName, 'Document')}</p>
                      <p className="mt-2 text-sm font-medium text-slate-500">{safeText(selected.description, 'Preview metadata is available for this document.')}</p>
                    </div>
                    <FileText className="h-9 w-9 text-blue-600" />
                  </div>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">File Name</dt><dd className="text-right font-black text-slate-800">{safeText(selected.fileName || selected.originalName || selected.title)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Type</dt><dd><TenantStatusBadge status={typeLabel(selected)} /></dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Size</dt><dd className="font-black text-slate-800">{fileSizeLabel(selected.size)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold text-slate-500">Uploaded</dt><dd className="text-right font-black text-slate-800">{dateTimeLabel(selected.generatedAt || selected.createdAt)}</dd></div>
                </dl>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => handleDownload(selected)} disabled={selected.canDownload === false} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button type="button" onClick={() => selected.fileUrl ? window.open(selected.fileUrl, '_blank', 'noopener,noreferrer') : setSelected(selected)} className="rounded-lg border border-blue-200 px-4 py-3 text-sm font-black text-blue-600 hover:bg-blue-50">
                    View Full
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-500">Your documents are securely filtered to your tenant profile.</p>
              </div>
            ) : (
              <EmptyTenantState title="No document selected" description="Select a document to preview details." />
            )}
          </aside>
        </div>
      </TenantPanel>
    </div>
  );
}
