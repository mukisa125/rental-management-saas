const express = require('express');
const controller = require('../controllers/tenantApplicationController');

const router = express.Router();

router.get('/public/:token', controller.getPublicApplication);
router.post('/public/:token', controller.submitPublicApplication);

module.exports = router;
