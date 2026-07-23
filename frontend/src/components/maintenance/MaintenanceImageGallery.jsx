import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function MaintenanceImageGallery({ images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const getImageUrl = (image) => {
    if (!image) return '';
    // If it's base64, use it directly
    if (image.base64) return image.base64;
    // If it's a data buffer stored in MongoDB, convert to base64
    if (image.data && typeof image.data === 'string') {
      return `data:${image.contentType || 'image/jpeg'};base64,${image.data}`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] max-w-[90vw] rounded-2xl bg-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/20 p-2 text-white hover:bg-black/40 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Main Image */}
        <div className="flex items-center justify-center bg-slate-100 p-4">
          <img
            src={getImageUrl(currentImage)}
            alt={`Maintenance issue ${currentIndex + 1}`}
            className="max-h-[60vh] max-w-[70vw] rounded-lg object-contain"
          />
        </div>

        {/* Navigation */}
        {hasMultiple && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
          {hasMultiple && `Image ${currentIndex + 1} of ${images.length}`}
          {currentImage.originalName && (
            <div className="mt-1 text-xs text-slate-500">
              {currentImage.originalName}
            </div>
          )}
        </div>

        {/* Thumbnail List */}
        {hasMultiple && (
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex gap-2 overflow-x-auto">
              {images.map((image, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-16 w-16 shrink-0 rounded-lg border-2 transition-all ${
                    idx === currentIndex
                      ? 'border-blue-600 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="h-full w-full rounded-md object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
