import { X, Upload, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  validateImageCount,
  processImages
} from '../../utils/imageCompression';

export default function AddMaintenanceModal({
  properties,
  units,
  onClose,
  onSubmit,
  loading
}) {
  const [formData, setFormData] = useState({
    property: '',
    unit: '',
    issueType: 'other',
    priority: 'medium',
    description: '',
    ownerNotes: ''
  });

  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [imageError, setImageError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const filteredUnits = formData.property
    ? units.filter((u) => String(u.property?._id || u.property) === formData.property)
    : [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePropertyChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      property: e.target.value,
      unit: ''
    }));
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    setImageError('');

    try {
      // Validate total count
      const incomingFiles = Array.from(files);
      const countValidation = validateImageCount(images.length, incomingFiles.length);
      if (!countValidation.valid) {
        setImageError(countValidation.error);
        return;
      }

      // Process images
      const remainingSlots = 3 - images.length;
      const processedImages = await processImages(incomingFiles, remainingSlots);

      // Create preview URLs
      const newPreviews = processedImages.map((img) => img.base64);

      setImages((prev) => [...prev, ...processedImages]);
      setImagePreviewUrls((prev) => [...prev, ...newPreviews]);

      // Reset input
      e.target.value = '';
    } catch (error) {
      setImageError(error.message);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.property) errors.property = 'Property is required';
    if (!formData.unit) errors.unit = 'Unit is required';
    if (!formData.issueType) errors.issueType = 'Issue type is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (formData.description.trim().length < 10)
      errors.description = 'Description must be at least 10 characters';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onSubmit({
      ...formData,
      issueImages: images,
      source: 'self_owner'
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 className="text-xl font-bold text-slate-900">Create Maintenance Request</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {/* Property and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Property *
                </label>
                <select
                  name="property"
                  value={formData.property}
                  onChange={handlePropertyChange}
                  className={`mt-2 w-full rounded-lg border ${
                    validationErrors.property
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:ring-blue-500'
                  } bg-white px-3 py-2 text-sm outline-none focus:border-current focus:ring-1`}
                >
                  <option value="">Select Property</option>
                  {properties.map((prop) => (
                    <option key={prop._id} value={prop._id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
                {validationErrors.property && (
                  <p className="mt-1 text-xs text-rose-600">{validationErrors.property}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Unit *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  disabled={!formData.property}
                  className={`mt-2 w-full rounded-lg border ${
                    validationErrors.unit
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:ring-blue-500'
                  } bg-white px-3 py-2 text-sm outline-none focus:border-current focus:ring-1 disabled:opacity-50`}
                >
                  <option value="">Select Unit</option>
                  {filteredUnits.map((unit) => (
                    <option key={unit._id} value={unit._id}>
                      {unit.unitNumber}
                    </option>
                  ))}
                </select>
                {validationErrors.unit && (
                  <p className="mt-1 text-xs text-rose-600">{validationErrors.unit}</p>
                )}
              </div>
            </div>

            {/* Issue Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Issue Type *
                </label>
                <select
                  name="issueType"
                  value={formData.issueType}
                  onChange={handleInputChange}
                  className={`mt-2 w-full rounded-lg border ${
                    validationErrors.issueType
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:ring-blue-500'
                  } bg-white px-3 py-2 text-sm outline-none focus:border-current focus:ring-1`}
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="door_window">Door/Window</option>
                  <option value="roofing">Roofing</option>
                  <option value="painting">Painting</option>
                  <option value="security">Security</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="appliance">Appliance</option>
                  <option value="internet">Internet</option>
                  <option value="other">Other</option>
                </select>
                {validationErrors.issueType && (
                  <p className="mt-1 text-xs text-rose-600">{validationErrors.issueType}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the maintenance issue in detail..."
                rows="4"
                className={`mt-2 w-full rounded-lg border ${
                  validationErrors.description
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-200 focus:ring-blue-500'
                } bg-white px-3 py-2 text-sm outline-none focus:border-current focus:ring-1`}
              />
              {validationErrors.description && (
                <p className="mt-1 text-xs text-rose-600">{validationErrors.description}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {formData.description.length} characters
              </p>
            </div>

            {/* Owner Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Additional Notes
              </label>
              <textarea
                name="ownerNotes"
                value={formData.ownerNotes}
                onChange={handleInputChange}
                placeholder="Any additional notes..."
                rows="3"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Issue Images (Max 3)
              </label>
              <label htmlFor="image-upload" className="mt-2 block cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
                <Upload className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Click to upload issue images
                </p>
                <p className="text-xs text-slate-500">JPG, PNG, WEBP up to 300 KB each</p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
              </label>
              {imageError && <p className="mt-2 text-xs text-rose-600">{imageError}</p>}
            </div>

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Selected Images ({imagePreviewUrls.length}/3)
                </label>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {imagePreviewUrls.map((url, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-lg">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/50"
                      >
                        <Trash2 className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit and Cancel */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
