import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SelfOwnerDocuments = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDocuments();
  }, [page]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/self-owner/documents', { params: { page, limit: 50 } });
      setDocuments(response.data.documents || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const getDocumentTypeIcon = (type) => {
    const icons = {
      lease: '📄',
      invoice: '💰',
      receipt: '🧾',
      notice: '📋',
      property_doc: '🏠',
      tenant_doc: '👤',
      contract: '✍️',
      report: '📊'
    };
    return icons[type] || '📃';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Documents</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((document) => (
          <div key={document._id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{getDocumentTypeIcon(document.documentType)}</div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded capitalize">
                {document.documentType}
              </span>
            </div>
            
            <h3 className="text-lg font-bold mb-2 truncate">{document.title}</h3>
            
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>📅 {new Date(document.uploadedAt).toLocaleDateString()}</p>
              <p>👤 {document.uploadedBy?.name}</p>
              {document.expiryDate && (
                <p className="text-red-600">⏰ Expires: {new Date(document.expiryDate).toLocaleDateString()}</p>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-500 text-white py-2 rounded text-sm text-center hover:bg-blue-600"
              >
                📥 Download
              </a>
              <button className="flex-1 bg-gray-500 text-white py-2 rounded text-sm hover:bg-gray-600">
                👁️ View
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No documents found</p>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SelfOwnerDocuments;
