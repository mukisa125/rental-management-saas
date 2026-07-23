import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Upload, X } from 'lucide-react';
import { selfOwnerAPI } from '../../services/api';
import DocumentSummaryCards from './DocumentSummaryCards';
import DocumentTabs from './DocumentTabs';
import DocumentFilterBar from './DocumentFilterBar';
import DocumentTable from './DocumentTable';
import DocumentPreviewPanel from './DocumentPreviewPanel';
import UploadDocumentModal from './UploadDocumentModal';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import { defaultPagination, defaultSummary, safeDate, safeText } from './documentUtils';

const defaultFilters = {
  search: '',
  category: '',
  property: '',
  tenant: '',
  status: '',
  sourceModule: '',
  startDate: '',
  endDate: ''
};

const mapTabToCategory = (tab) => (tab === 'All Documents' ? '' : tab);

export default function SelfOwnerDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [summary, setSummary] = useState(defaultSummary);
  const [filters, setFilters] = useState(defaultFilters);
  const [activeTab, setActiveTab] = useState('All Documents');
  const [pagination, setPagination] = useState(defaultPagination);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [uploadState, setUploadState] = useState({ open: false, mode: 'create', progress: 0, loading: false, target: null });
  const [previewUrl, setPreviewUrl] = useState('');
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  const previewUrlRef = useRef('');

  const releasePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPreviewUrl('');
  }, []);

  const refreshPreviewBlob = useCallback(async (document) => {
    if (!document?._id) {
      releasePreviewUrl();
      return;
    }

    try {
      const response = await selfOwnerAPI.downloadDocument(document._id);
      const contentType = String(response?.headers?.['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const parsed = JSON.parse(text || '{}');
        if (parsed?.fileUrl) {
          releasePreviewUrl();
          setPreviewUrl(parsed.fileUrl);
          return;
        }
      }

      const blob = new Blob([response.data], { type: contentType || document.mimeType || 'application/octet-stream' });
      releasePreviewUrl();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      releasePreviewUrl();
    }
  }, [releasePreviewUrl]);

  const loadReferenceData = useCallback(async () => {
    const [propertyResponse, tenantResponse, unitResponse] = await Promise.all([
      selfOwnerAPI.getProperties({ page: 1, limit: 500 }),
      selfOwnerAPI.getTenants({ page: 1, limit: 500 }),
      selfOwnerAPI.getUnits({ page: 1, limit: 500 })
    ]);

    setProperties(propertyResponse?.data?.properties || []);
    setTenants(tenantResponse?.data?.tenants || []);
    setUnits(unitResponse?.data?.units || []);
  }, []);

  const queryPayload = useMemo(() => ({
    ...filters,
    category: mapTabToCategory(activeTab) || filters.category,
    page: pagination.page,
    limit: pagination.limit
  }), [filters, activeTab, pagination.page, pagination.limit]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [listResponse, summaryResponse] = await Promise.all([
        selfOwnerAPI.getDocuments(queryPayload),
        selfOwnerAPI.getDocumentSummary(queryPayload)
      ]);

      const nextDocuments = listResponse?.data?.documents || [];
      const nextPagination = listResponse?.data?.pagination || defaultPagination;
      const nextSummary = summaryResponse?.data?.summary || defaultSummary;

      setDocuments(nextDocuments);
      setPagination((previous) => ({ ...previous, ...nextPagination, page: nextPagination.page || previous.page || 1 }));
      setSummary({ ...defaultSummary, ...nextSummary });
      setError('');

      setSelectedDocument((previousSelected) => {
        if (!previousSelected?._id) return previousSelected;
        return nextDocuments.find((item) => item._id === previousSelected._id) || null;
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Failed to load documents');
      setDocuments([]);
      setSummary(defaultSummary);
      setPagination(defaultPagination);
    } finally {
      setLoading(false);
    }
  }, [queryPayload]);

  useEffect(() => {
    loadReferenceData().catch(() => {
      setProperties([]);
      setTenants([]);
      setUnits([]);
    });
  }, [loadReferenceData]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => () => releasePreviewUrl(), [releasePreviewUrl]);

  useEffect(() => {
    if (!documents.length) {
      if (selectedDocument) {
        setSelectedDocument(null);
        releasePreviewUrl();
      }
      return;
    }

    if (!selectedDocument) {
      const firstDocument = documents[0];
      setSelectedDocument(firstDocument);
      refreshPreviewBlob(firstDocument);
      return;
    }

    const exists = documents.some((item) => item._id === selectedDocument._id);
    if (!exists) {
      const firstDocument = documents[0];
      setSelectedDocument(firstDocument);
      refreshPreviewBlob(firstDocument);
    }
  }, [documents, refreshPreviewBlob, releasePreviewUrl, selectedDocument]);

  const handleSelect = async (document) => {
    setSelectedDocument(document);
    await refreshPreviewBlob(document);
  };

  const handleDownload = async (docItem) => {
    try {
      const response = await selfOwnerAPI.downloadDocument(docItem._id);
      const contentType = String(response?.headers?.['content-type'] || '');

      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const parsed = JSON.parse(text || '{}');
        if (parsed?.fileUrl) {
          window.open(parsed.fileUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      }

      const blob = new Blob([response.data], { type: contentType || docItem.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = docItem.fileName || docItem.title || 'document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      alert(requestError?.response?.data?.message || requestError.message || 'Unable to download document');
    }
  };

  const handleOpen = (docItem) => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    handleDownload(docItem);
  };

  const handlePrint = (docItem) => {
    if (!previewUrl) {
      handleDownload(docItem);
      return;
    }
    const printWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleDelete = async (document) => {
    const confirmed = window.confirm(`Delete ${safeText(document?.title || document?.documentName, 'this document')}?`);
    if (!confirmed) return;

    try {
      await selfOwnerAPI.deleteDocument(document._id);
      if (selectedDocument?._id === document._id) {
        setSelectedDocument(null);
        releasePreviewUrl();
      }
      await fetchDocuments();
    } catch (requestError) {
      alert(requestError?.response?.data?.message || requestError.message || 'Unable to delete document');
    }
  };

  const openCreateModal = () => setUploadState({ open: true, mode: 'create', progress: 0, loading: false, target: null });
  const openReplaceModal = (document) => setUploadState({ open: true, mode: 'replace', progress: 0, loading: false, target: document });
  const closeModal = () => setUploadState({ open: false, mode: 'create', progress: 0, loading: false, target: null });

  const handleUploadSubmit = async (payload) => {
    const formData = new FormData();
    formData.append('title', payload.title || 'Untitled Document');
    formData.append('category', payload.category || 'System Generated');
    formData.append('status', payload.status || 'Active');
    formData.append('sourceModule', 'manual_upload');
    formData.append('sourceAction', uploadState.mode === 'replace' ? 'manual_replaced' : 'manual_uploaded');
    if (payload.property) formData.append('property', payload.property);
    if (payload.unit) formData.append('unit', payload.unit);
    if (payload.tenant) formData.append('tenant', payload.tenant);
    if (payload.expiryDate) formData.append('expiryDate', payload.expiryDate);
    if (payload.notes) formData.append('notes', payload.notes);
    if (payload.file) formData.append('file', payload.file);

    setUploadState((previous) => ({ ...previous, loading: true, progress: 0 }));
    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const percent = event.total ? (event.loaded / event.total) * 100 : 0;
          setUploadState((previous) => ({ ...previous, progress: percent }));
        }
      };

      if (uploadState.mode === 'replace' && uploadState.target?._id) {
        await selfOwnerAPI.replaceDocument(uploadState.target._id, formData, config);
      } else {
        await selfOwnerAPI.uploadDocument(formData, config);
      }

      closeModal();
      await fetchDocuments();
    } catch (requestError) {
      alert(requestError?.response?.data?.message || requestError.message || 'Unable to save document');
      setUploadState((previous) => ({ ...previous, loading: false }));
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Self Owner Documents', 14, 12);

    autoTable(doc, {
      startY: 18,
      head: [['Name', 'Category', 'Property', 'Unit', 'Tenant', 'Type', 'Status', 'Created']],
      body: (documents || []).map((item) => [
        safeText(item.title || item.documentName),
        safeText(item.category),
        safeText(item.property?.name),
        safeText(item.unit?.unitNumber),
        safeText(item.tenant?.fullName),
        safeText(item.fileType),
        safeText(item.status),
        safeDate(item.createdAt)
      ])
    });

    doc.save(`self-owner-documents-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportExcel = () => {
    const sheetData = (documents || []).map((item) => ({
      Document: safeText(item.title || item.documentName),
      Category: safeText(item.category),
      Property: safeText(item.property?.name),
      Unit: safeText(item.unit?.unitNumber),
      Tenant: safeText(item.tenant?.fullName),
      Source: safeText(item.sourceModule),
      FileType: safeText(item.fileType),
      FileSize: item.size || 0,
      Status: safeText(item.status),
      CreatedAt: safeDate(item.createdAt),
      ExpiryDate: safeDate(item.expiryDate)
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');
    XLSX.writeFile(workbook, `self-owner-documents-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrintLibrary = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;

    const rows = (documents || []).map((item) => (
      `<tr>
        <td>${safeText(item.title || item.documentName)}</td>
        <td>${safeText(item.category)}</td>
        <td>${safeText(item.property?.name)}</td>
        <td>${safeText(item.unit?.unitNumber)}</td>
        <td>${safeText(item.tenant?.fullName)}</td>
        <td>${safeText(item.status)}</td>
        <td>${safeDate(item.createdAt)}</td>
      </tr>`
    )).join('');

    printWindow.document.write(`
      <html>
        <head><title>Self Owner Documents</title></head>
        <body>
          <h2>Self Owner Documents</h2>
          <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:12px;">
            <thead>
              <tr>
                <th>Document</th><th>Category</th><th>Property</th><th>Unit</th><th>Tenant</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">No documents found</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setActiveTab('All Documents');
    setPagination((previous) => ({ ...previous, page: 1 }));
  };

  const handleFilterChange = (next) => {
    setFilters(next);
    setPagination((previous) => ({ ...previous, page: 1 }));
  };

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    if (nextTab !== 'All Documents') {
      setFilters((previous) => ({ ...previous, category: nextTab }));
    }
    setPagination((previous) => ({ ...previous, page: 1 }));
  };

  const handlePageChange = (nextPage) => {
    setPagination((previous) => ({ ...previous, page: nextPage }));
  };

  const handleLimitChange = (nextLimit) => {
    setPagination((previous) => ({ ...previous, limit: nextLimit, page: 1 }));
  };

  return (
    <div className="min-h-screen space-y-4 bg-slate-50 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-600">Store and manage all your property, tenant, lease, payment, and maintenance documents.</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          <Upload className="h-4 w-4" /> Upload Document
        </button>
      </header>

      <DocumentSummaryCards summary={summary} />
      <DocumentTabs activeCategory={activeTab} onChange={handleTabChange} />

      <DocumentFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        properties={properties}
        tenants={tenants}
        onOpenUpload={openCreateModal}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onPrint={handlePrintLibrary}
      />

      {loading ? <LoadingState /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={fetchDocuments} /> : null}

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
          <div className="xl:col-span-7">
            <DocumentTable
              documents={documents}
              selectedId={selectedDocument?._id}
              onSelect={handleSelect}
              onPreview={handleSelect}
              onDownload={handleDownload}
              onPrint={handlePrint}
              onReplace={openReplaceModal}
              onDelete={handleDelete}
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onOpenUpload={openCreateModal}
            />
          </div>

          <div className="xl:col-span-3">
            <DocumentPreviewPanel
              selectedDocument={selectedDocument}
              previewUrl={previewUrl}
              onOpenPreview={() => {
                if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
              }}
              onOpen={handleOpen}
              onDownload={handleDownload}
              onPrint={handlePrint}
              onReplace={openReplaceModal}
              onDelete={handleDelete}
            />
          </div>
        </div>
      ) : null}

      {selectedDocument ? (
        <button
          onClick={() => setIsMobilePreviewOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg md:hidden"
        >
          Preview Document
        </button>
      ) : null}

      {isMobilePreviewOpen && selectedDocument ? (
        <div className="fixed inset-0 z-40 bg-slate-900/40 p-3 md:hidden">
          <div className="h-full overflow-auto rounded-2xl bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Document Preview</p>
              <button onClick={() => setIsMobilePreviewOpen(false)} className="rounded-md border border-slate-200 p-1.5 text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <DocumentPreviewPanel
              selectedDocument={selectedDocument}
              previewUrl={previewUrl}
              onOpenPreview={() => {
                if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
              }}
              onOpen={handleOpen}
              onDownload={handleDownload}
              onPrint={handlePrint}
              onReplace={openReplaceModal}
              onDelete={handleDelete}
            />
          </div>
        </div>
      ) : null}

      <UploadDocumentModal
        isOpen={uploadState.open}
        mode={uploadState.mode}
        selectedDocument={uploadState.target}
        properties={properties}
        units={units}
        tenants={tenants}
        loading={uploadState.loading}
        progress={uploadState.progress}
        onClose={closeModal}
        onSubmit={handleUploadSubmit}
      />
    </div>
  );
}
