const express = require('express');
const { protect } = require('../middleware/rbacMiddleware');
const {
  getTenantDocuments,
  getPropertyDocuments,
  uploadDocument,
  deleteDocument
} = require('../controllers/documentController');

const router = express.Router();

// All document routes require authentication
router.use(protect);

router.get('/tenant/:tenantId', getTenantDocuments);
router.get('/property/:propertyId', getPropertyDocuments);
router.post('/', uploadDocument);
router.delete('/:documentId', deleteDocument);

module.exports = router;
