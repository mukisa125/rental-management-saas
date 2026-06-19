import { useEffect, useState } from 'react';
import { tenantPortalAPI } from '../../services/api';
import { FileText, Download } from 'lucide-react';

const TenantDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await tenantPortalAPI.getDocuments();
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  };

  const handleDownload = (document) => {
    // In a real implementation, this would trigger a download
    window.open(document.fileUrl, '_blank');
  };

  const getDocumentIcon = (docType) => {
    switch (docType) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'jpg':
      case 'png':
        return '🖼️';
      default:
        return '📎';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const groupedByType = documents.reduce((acc, doc) => {
    const type = doc.documentType || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
        <p className="text-gray-600 mt-2">View and download your lease agreements, notices, and attachments</p>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByType).map(([docType, docs]) => (
            <div key={docType} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {docType.replace('_', ' ')} Documents
                </h2>
              </div>

              <div className="divide-y">
                {docs.map((doc) => (
                  <div key={doc._id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl">{getDocumentIcon(doc.fileType)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs text-gray-600">
                              Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                            {doc.uploadedBy && (
                              <>
                                <span className="text-gray-400">•</span>
                                <p className="text-xs text-gray-600">
                                  by {doc.uploadedBy.name}
                                </p>
                              </>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-2">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No documents available yet.</p>
        </div>
      )}
    </div>
  );
};

export default TenantDocuments;
