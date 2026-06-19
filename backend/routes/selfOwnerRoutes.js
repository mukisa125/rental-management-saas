const express = require('express');
const { protect, authorize, isolateCompanyData } = require('../middleware/rbacMiddleware');
const controller = require('../controllers/selfOwnerController');

const router = express.Router();
router.use(protect, authorize('self_owner'), isolateCompanyData);

router.get('/dashboard', controller.getDashboard);
router.route('/properties').get(controller.getProperties).post(controller.createProperty);
router.route('/properties/:id').put(controller.updateProperty).delete(controller.deleteProperty);
router.get('/properties/:propertyId/units', controller.getPropertyUnits);
router.route('/units').get(controller.getUnits).post(controller.createUnit);
router.put('/units/:id', controller.updateUnit);
router.route('/tenants').get(controller.getTenants).post(controller.createTenant);
router.put('/tenants/:id', controller.updateTenant);
router.route('/payments').get(controller.getPayments).post(controller.recordPayment);
router.post('/invoices', controller.createInvoice);
router.get('/maintenance', controller.getMaintenanceRequests);
router.put('/maintenance/:id', controller.updateMaintenance);
router.route('/documents').get(controller.getDocuments).post(controller.createDocument);
router.route('/notices').get(controller.getNotices).post(controller.createNotice);
router.get('/reports/:reportType', controller.generateReport);

module.exports = router;
