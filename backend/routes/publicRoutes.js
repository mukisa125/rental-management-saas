const express = require('express');
const propertySeekerController = require('../controllers/propertySeekerController');

const router = express.Router();

router.get('/property-seeker-pricing', propertySeekerController.getPublicPricing);
router.get('/vacant-listings', propertySeekerController.getPublicVacantListings);

module.exports = router;
