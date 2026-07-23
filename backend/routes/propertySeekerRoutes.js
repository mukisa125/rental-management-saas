const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const propertySeekerController = require('../controllers/propertySeekerController');

const router = express.Router();

router.post('/auth/google', propertySeekerController.googleAuth);
router.get('/auth/google/config', propertySeekerController.getGoogleAuthConfig);

router.use(protect);
router.use(propertySeekerController.requireSeeker);

router.get('/me', propertySeekerController.getSeekerMe);
router.put('/profile', propertySeekerController.updateSeekerProfile);
router.post('/payments', propertySeekerController.createPaymentRequest);
router.post('/unlock-listing/:listingId', propertySeekerController.unlockListing);
router.get('/dashboard', propertySeekerController.getSeekerDashboard);

module.exports = router;
