const express = require('express');
const multer = require('multer');
const { protect, authorize, isolateCompanyData } = require('../middleware/rbacMiddleware');
const controller = require('../controllers/selfOwnerController');
const settingsController = require('../controllers/selfOwnerSettingsController');
const tenantApplicationController = require('../controllers/tenantApplicationController');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 8 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const allowed = new Set([
			'application/pdf',
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/webp',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		]);
		cb(null, allowed.has(file.mimetype));
	}
});
// This endpoint powers a tenant-facing QR receipt check and deliberately
// exposes no tenant or owner details.
router.get('/payments/verify/:receiptNumber', controller.verifyReceipt);
router.use(protect, authorize('self_owner', 'manager'), isolateCompanyData);

router.get('/dashboard', controller.getDashboard);
router.get('/settings', authorize('self_owner'), settingsController.getSettings);
router.get('/settings/tab/:tab', authorize('self_owner'), settingsController.getTabData);
router.put('/settings/profile', authorize('self_owner'), settingsController.saveProfile);
router.put('/settings/business', authorize('self_owner'), settingsController.saveBusiness);
router.put('/settings/payments', authorize('self_owner'), settingsController.savePayments);
router.put('/settings/receipts', authorize('self_owner'), settingsController.saveReceipts);
router.put('/settings/notifications', authorize('self_owner'), settingsController.saveNotifications);
router.put('/settings/rent-lease', authorize('self_owner'), settingsController.saveRentLease);
router.put('/settings/documents', authorize('self_owner'), settingsController.saveDocuments);
router.put('/settings/security', authorize('self_owner'), settingsController.saveSecurity);
router.put('/settings/security/password', authorize('self_owner'), settingsController.updatePassword);
router.put('/settings/preferences', authorize('self_owner'), settingsController.savePreferences);
router.delete('/settings/account', authorize('self_owner'), settingsController.deleteAccount);
router.get('/whatsapp/status', whatsappController.getStatus);
router.post('/whatsapp/messages', whatsappController.sendMessage);
router.route('/properties').get(controller.getProperties).post(controller.createProperty);
router.route('/properties/:id').put(controller.updateProperty).delete(controller.deleteProperty);
router.get('/properties/:propertyId/units', controller.getPropertyUnits);
router.route('/units').get(controller.getUnits).post(controller.createUnit);
router.route('/units/:id').put(controller.updateUnit).delete(controller.deleteUnit);
router.post('/units/:unitId/tenant-application-link', tenantApplicationController.generateApplicationLink);
router.route('/tenants').get(controller.getTenants).post(controller.createTenant);
router.route('/tenants/:id').put(controller.updateTenant).delete(controller.deleteTenant);
router.get('/tenant-applications', tenantApplicationController.getOwnerApplications);
router.post('/tenant-applications/:id/approve', tenantApplicationController.approveApplication);
router.post('/tenant-applications/:id/reject', tenantApplicationController.rejectApplication);
router.get('/payments/summary', controller.getPaymentSummary);
router.route('/payments').get(controller.getPayments).post(controller.recordPayment);
router.post('/payments/:id/record-payment', controller.recordPaymentOnInvoice);
router.post('/payments/:id/whatsapp-receipt', whatsappController.sendPaymentReceipt);
router.get('/payments/:id/receipt', controller.getReceipt);
router.route('/payments/:id').get(controller.getPaymentById).put(controller.updatePayment).delete(controller.deletePayment);
router.post('/invoices/monthly', controller.generateMonthlyInvoices);
router.route('/invoices').post(controller.createInvoice);
router.route('/maintenance').get(controller.getMaintenanceRequests).post(controller.createMaintenance);
router.post('/maintenance/:id/comments', controller.addMaintenanceComment);
router.post('/maintenance/:maintenanceId/comments', controller.addMaintenanceComment);
router.patch('/maintenance/:id/status', controller.updateMaintenanceStatus);
router.route('/maintenance/:id').get(controller.getMaintenanceById).put(controller.updateMaintenance).delete(controller.deleteMaintenance);
router.get('/maintenance/:maintenanceId/detail', controller.getMaintenanceById);
router.route('/documents').get(controller.getDocuments).post(upload.single('file'), controller.createDocument);
router.get('/documents/summary', controller.getDocumentSummary);
router.post('/documents/upload', upload.single('file'), controller.uploadDocument);
router.get('/documents/:id', controller.getDocumentById);
router.get('/documents/:id/download', controller.downloadDocument);
router.put('/documents/:id', upload.single('file'), controller.updateDocument);
router.delete('/documents/:id', controller.deleteDocument);
router.route('/notices').get(controller.getNotices).post(controller.createNotice);
router.delete('/notices/:id', controller.deleteNotice);
router.get('/reports/:reportType', controller.generateReport);

module.exports = router;
