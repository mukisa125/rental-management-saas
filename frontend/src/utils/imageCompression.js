/**
 * Image compression utility for maintenance request images
 * Compresses images client-side before sending to backend
 */

const COMPRESSION_CONFIG = {
  MAX_IMAGES: 3,
  MAX_SIZE_PER_IMAGE: 300 * 1024, // 300 KB
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 1200,
  QUALITY: 0.8, // 80% quality
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

/**
 * Validates image file
 * @param {File} file - Image file to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!COMPRESSION_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPG, JPEG, PNG, and WEBP images are allowed'
    };
  }

  if (file.size > COMPRESSION_CONFIG.MAX_SIZE_PER_IMAGE * 1.5) {
    return {
      valid: false,
      error: `File too large. Maximum ${Math.ceil(COMPRESSION_CONFIG.MAX_SIZE_PER_IMAGE / 1024)} KB per image`
    };
  }

  return { valid: true };
};

/**
 * Validates total number of images
 * @param {number} currentCount - Current number of images
 * @param {number} incomingCount - Number of new images to add
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateImageCount = (currentCount, incomingCount = 1) => {
  if (currentCount >= COMPRESSION_CONFIG.MAX_IMAGES) {
    return {
      valid: false,
      error: `Maximum ${COMPRESSION_CONFIG.MAX_IMAGES} images allowed`
    };
  }

  if (currentCount + incomingCount > COMPRESSION_CONFIG.MAX_IMAGES) {
    return {
      valid: false,
      error: `Maximum ${COMPRESSION_CONFIG.MAX_IMAGES} images allowed`
    };
  }
  return { valid: true };
};

/**
 * Compresses image using Canvas API
 * @param {File} file - Image file to compress
 * @returns {Promise<string>} - Compressed base64 image
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > COMPRESSION_CONFIG.MAX_WIDTH) {
            height = Math.round((height * COMPRESSION_CONFIG.MAX_WIDTH) / width);
            width = COMPRESSION_CONFIG.MAX_WIDTH;
          }
        } else {
          if (height > COMPRESSION_CONFIG.MAX_HEIGHT) {
            width = Math.round((width * COMPRESSION_CONFIG.MAX_HEIGHT) / height);
            height = COMPRESSION_CONFIG.MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(
          contentType,
          COMPRESSION_CONFIG.QUALITY
        );

        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Process multiple images
 * @param {FileList|File[]} files - Files from input
 * @param {number} maxImages - Maximum number of files to process from this batch
 * @returns {Promise<Array>} - Array of compressed image objects
 */
export const processImages = async (files, maxImages = COMPRESSION_CONFIG.MAX_IMAGES) => {
  const processedImages = [];
  const fileArray = Array.from(files || []).slice(0, Math.max(0, maxImages));

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const validation = validateImageFile(file);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      const base64 = await compressImage(file);
      const sizeInBytes = Math.round((base64.length - 'data:image/jpeg;base64,'.length) / 1.33);

      processedImages.push({
        base64,
        contentType: file.type,
        originalName: file.name,
        size: sizeInBytes,
        // uploadedBy and uploadedAt will be set by backend
      });
    } catch (error) {
      throw new Error(`Failed to process ${file.name}: ${error.message}`);
    }
  }

  return processedImages;
};

/**
 * Get base64 string from processed image
 * @param {string} base64DataUrl - Data URL from canvas
 * @returns {string} - Pure base64 string
 */
export const extractBase64 = (base64DataUrl) => {
  return base64DataUrl.split(',')[1];
};

/**
 * Validate and get max image size info
 * @returns {Object} - Size info
 */
export const getImageSizeInfo = () => {
  return {
    maxImagesAllowed: COMPRESSION_CONFIG.MAX_IMAGES,
    maxSizePerImage: COMPRESSION_CONFIG.MAX_SIZE_PER_IMAGE,
    maxSizePerImageKB: Math.ceil(COMPRESSION_CONFIG.MAX_SIZE_PER_IMAGE / 1024),
    allowedTypes: COMPRESSION_CONFIG.ALLOWED_TYPES
  };
};

export default {
  COMPRESSION_CONFIG,
  validateImageFile,
  validateImageCount,
  compressImage,
  processImages,
  extractBase64,
  getImageSizeInfo
};
