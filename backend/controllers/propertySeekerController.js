const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Unit = require('../models/Unit');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const BillingTransaction = require('../models/BillingTransaction');
const ListingUnlock = require('../models/ListingUnlock');

const TOKEN_LIFETIME = '30d';
const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;
const FREE_PROPERTY_UNLOCKS = String(process.env.PROPERTY_SEEKER_FREE_UNLOCKS ?? 'true').trim().toLowerCase() !== 'false';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanString = (value, max = 300) => String(value || '').trim().slice(0, max);

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: TOKEN_LIFETIME });

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const publicPlanQuery = {
  deletedAt: null,
  isActive: true,
  status: 'active',
  planType: 'property_seeker'
};

const getDefaultPricingPlan = async () => (
  await SubscriptionPlan.findOne({ ...publicPlanQuery, billingModel: 'pay_per_view' }).sort({ displayOrder: 1, price: 1, monthlyPrice: 1 })
  || await SubscriptionPlan.findOne(publicPlanQuery).sort({ displayOrder: 1, price: 1, monthlyPrice: 1 })
);

const imageToSrc = (image) => {
  if (!image) return '';
  if (image.url) return image.url;
  if (image.base64 && image.contentType) return `data:${image.contentType};base64,${image.base64}`;
  return '';
};

const pickCoverImage = (unit, property) => {
  const unitImages = Array.isArray(unit?.images) ? unit.images : [];
  const propertyImages = Array.isArray(property?.propertyImages) ? property.propertyImages : [];
  return unitImages.find((image) => image.isMain)
    || unitImages[0]
    || propertyImages.find((image) => image.isMain)
    || propertyImages[0]
    || null;
};

const allGalleryImages = (unit, property) => {
  const images = [
    ...(Array.isArray(unit?.images) ? unit.images : []),
    ...(Array.isArray(property?.propertyImages) ? property.propertyImages : [])
  ];

  return images
    .map((image, index) => ({
      id: image._id || `${index}`,
      src: imageToSrc(image),
      alt: image.originalName || `Property image ${index + 1}`
    }))
    .filter((image) => image.src);
};

const generalLocation = (property) => (
  cleanString(property?.generalArea, 120)
  || cleanString(property?.address?.city, 80)
  || cleanString(property?.address?.state, 80)
  || cleanString(property?.address?.country, 80)
  || cleanString(property?.location, 120)
  || 'N/A'
);

const exactAddress = (property) => (
  cleanString(property?.formattedAddress, 240)
  || cleanString(property?.address?.formattedAddress, 240)
  || cleanString(property?.googleMapsLocation, 240)
  || cleanString(property?.location, 240)
  || 'N/A'
);

const propertyCoordinates = (property) => {
  const lat = toNumber(property?.latitude ?? property?.address?.gps?.latitude, null);
  const lng = toNumber(property?.longitude ?? property?.address?.gps?.longitude, null);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const deterministicOffset = (id, range = 0.012) => {
  const seed = String(id || '');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  const latOffset = (((hash % 1000) / 1000) - 0.5) * range;
  const lngOffset = ((((hash >> 8) % 1000) / 1000) - 0.5) * range;
  return { latOffset, lngOffset };
};

const approximateCoordinates = (unit, property) => {
  const exact = propertyCoordinates(property);
  if (!exact) return null;
  const offset = deterministicOffset(unit?._id || property?._id);
  return {
    lat: Number((exact.lat + offset.latOffset).toFixed(4)),
    lng: Number((exact.lng + offset.lngOffset).toFixed(4))
  };
};

const publishedMarketplaceUnit = (unit) => {
  const property = unit?.property;
  return Boolean(
    unit
    && property
    && unit.status === 'vacant'
    && !unit.deletedAt
    && !unit.currentTenant
    && property.deletedAt === null
    && property.status === 'active'
    && property.publishToMarketplace === true
    && property.showOnMap === true
  );
};

const publicListingPayload = (unit) => {
  const property = unit.property || {};
  const cover = pickCoverImage(unit, property);
  return {
    listingId: unit._id,
    propertyId: property._id || null,
    unitId: unit._id,
    title: `${property.name || 'Property'}${unit.unitNumber ? ` - Unit ${unit.unitNumber}` : ''}`,
    generalLocation: generalLocation(property),
    rent: toNumber(unit.rentAmount),
    unitType: property.propertyType || 'apartment',
    bedrooms: toNumber(unit.bedrooms, 1),
    bathrooms: toNumber(unit.bathrooms, 1),
    coverImage: imageToSrc(cover),
    shortDescription: cleanString(unit.description || property.description || 'No description provided.', 180),
    vacantStatus: 'vacant',
    approximateCoordinates: approximateCoordinates(unit, property)
  };
};

const unlockedListingPayload = (unit, unlock, seeker) => {
  const property = unit.property || {};
  const owner = unit.owner || property.owner || {};
  const coords = propertyCoordinates(property);
  const canRevealContact = property.allowContactReveal !== false;
  const canBookVisit = property.allowVisitBooking !== false;

  return {
    ...publicListingPayload(unit),
    unlocked: true,
    unlockId: unlock?._id || null,
    unlockedAt: unlock?.unlockedAt || null,
    expiresAt: unlock?.expiresAt || null,
    remainingViews: toNumber(seeker?.propertySeekerStats?.walletBalance ?? seeker?.propertySeekerStats?.remainingViews),
    exactAddress: exactAddress(property),
    exactCoordinates: coords,
    landlordContact: canRevealContact ? {
      name: owner.name || 'Landlord',
      phone: owner.phone || owner.whatsAppNumber || 'N/A',
      whatsapp: owner.whatsAppNumber || owner.phone || 'N/A',
      email: owner.email || 'N/A'
    } : null,
    bookingAllowed: canBookVisit,
    fullDescription: cleanString(unit.description || property.description || 'No description provided.', 1200),
    propertyOverview: cleanString(property.description || 'No description provided.', 800),
    amenities: [
      ...(Array.isArray(unit.amenities) ? unit.amenities : []),
      ...(Array.isArray(property.amenities) ? property.amenities : [])
    ].map((item) => item?.name || item).filter(Boolean),
    galleryImages: allGalleryImages(unit, property),
    depositAmount: toNumber(unit.depositAmount),
    propertyType: property.propertyType || 'apartment'
  };
};

const normalizeMobileMoneyNumber = (value) => {
  const raw = String(value || '').trim().replace(/\s+/g, '');
  if (/^\+2567\d{8}$/.test(raw)) return raw;
  if (/^07\d{8}$/.test(raw)) return `+256${raw.slice(1)}`;
  return '';
};

const decodeJwtPayload = (credential) => {
  const [, payload] = String(credential || '').split('.');
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const resolveGoogleConfig = () => {
  const clientId = String(
    process.env.GOOGLE_CLIENT_ID
    || process.env.GOOGLE_OAUTH_CLIENT_ID
    || process.env.GOOGLE_CLIENTID
    || ''
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_CLIENT_SECRET
    || process.env.GOOGLE_OAUTH_CLIENT_SECRET
    || process.env.GOOGLE_SECRET_ID
    || process.env.GOOGLE_CLIENTSECRET
    || ''
  ).trim();
  const redirectUri = String(
    process.env.GOOGLE_REDIRECT_URI
    || process.env.GOOGLE_OAUTH_REDIRECT_URI
    || 'postmessage'
  ).trim();
  return { clientId, clientSecret, redirectUri };
};

const getGoogleAuthConfig = async (req, res) => {
  try {
    const { clientId, clientSecret } = resolveGoogleConfig();
    const hasSecret = Boolean(clientSecret);
    const missingFields = [];
    if (!clientId) missingFields.push('GOOGLE_CLIENT_ID');
    if (!hasSecret) missingFields.push('GOOGLE_CLIENT_SECRET');
    res.json({
      success: true,
      configured: Boolean(clientId && hasSecret),
      supportsIdTokenFlow: Boolean(clientId),
      supportsCodeFlow: Boolean(clientId && hasSecret),
      clientId: clientId || '',
      missingFields
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyGoogleIdToken = async (idToken) => {
  const { clientId } = resolveGoogleConfig();
  if (!clientId) {
    const error = new Error('Google sign-in is not configured. Add GOOGLE_CLIENT_ID on the backend.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    const error = new Error('Google sign-in could not be verified.');
    error.status = 401;
    throw error;
  }

  const profile = await response.json();
  if (profile.aud !== clientId || profile.email_verified !== 'true') {
    const error = new Error('Google account verification failed.');
    error.status = 401;
    throw error;
  }

  const decoded = decodeJwtPayload(idToken);
  return {
    googleId: profile.sub,
    email: String(profile.email || '').toLowerCase(),
    fullName: profile.name || decoded?.name || profile.email,
    profilePhoto: profile.picture || decoded?.picture || ''
  };
};

const exchangeGoogleCode = async (code, redirectUri) => {
  const { clientId, clientSecret, redirectUri: defaultRedirectUri } = resolveGoogleConfig();
  if (!clientId || !clientSecret) {
    const error = new Error('Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend.');
    error.status = 503;
    throw error;
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: String(code || '').trim(),
    grant_type: 'authorization_code',
    redirect_uri: String(redirectUri || defaultRedirectUri).trim()
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.id_token) {
    const error = new Error(tokenPayload.error_description || 'Google authorization code exchange failed.');
    error.status = 401;
    throw error;
  }

  return tokenPayload;
};

const verifyGoogleAuthPayload = async ({ credential, code, redirectUri }) => {
  if (credential) return verifyGoogleIdToken(credential);
  if (!code) {
    const error = new Error('Google sign-in request is missing credential or authorization code.');
    error.status = 400;
    throw error;
  }

  const tokenPayload = await exchangeGoogleCode(code, redirectUri);
  return verifyGoogleIdToken(tokenPayload.id_token);
};

const getPublicPricing = async (req, res) => {
  try {
    const plan = await getDefaultPricingPlan();
    const pricePerView = toNumber(plan?.price || plan?.monthlyPrice);
    res.json({
      success: true,
      pricing: {
        planId: plan?._id || null,
        planName: plan?.name || 'N/A',
        pricePerView,
        currency: 'UGX',
        minimumViews: Math.max(1, toNumber(plan?.includedViews ? 1 : 1, 1)),
        maximumViews: 100,
        configured: Boolean(plan && pricePerView > 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPublicVacantListings = async (req, res) => {
  try {
    const { search = '', propertyType = '', bedrooms = '', priceRange = '', sort = 'latest' } = req.query;
    const units = await Unit.find({ status: 'vacant', deletedAt: null })
      .populate('property')
      .populate('owner', 'name phone whatsAppNumber email')
      .sort({ createdAt: -1 })
      .limit(200);

    let listings = units.filter(publishedMarketplaceUnit).map(publicListingPayload);

    if (search) {
      const term = String(search).toLowerCase();
      listings = listings.filter((listing) => (
        `${listing.title} ${listing.generalLocation} ${listing.shortDescription}`.toLowerCase().includes(term)
      ));
    }

    if (propertyType) {
      listings = listings.filter((listing) => String(listing.unitType).toLowerCase() === String(propertyType).toLowerCase());
    }

    if (bedrooms) {
      const minBeds = toNumber(bedrooms);
      if (minBeds > 0) listings = listings.filter((listing) => toNumber(listing.bedrooms) >= minBeds);
    }

    if (priceRange) {
      const [min, max] = String(priceRange).split('-').map((value) => toNumber(value, null));
      listings = listings.filter((listing) => {
        const rent = toNumber(listing.rent);
        if (min !== null && rent < min) return false;
        if (max !== null && max > 0 && rent > max) return false;
        return true;
      });
    }

    if (sort === 'rent_low') listings.sort((a, b) => toNumber(a.rent) - toNumber(b.rent));
    if (sort === 'rent_high') listings.sort((a, b) => toNumber(b.rent) - toNumber(a.rent));

    res.json({ success: true, listings, total: listings.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    const profile = await verifyGoogleAuthPayload({
      credential: req.body?.credential,
      code: req.body?.code,
      redirectUri: req.body?.redirectUri
    });
    if (!profile.email) return res.status(400).json({ success: false, message: 'Google account email is required.' });

    let user = await User.findOne({ email: profile.email, deletedAt: null });
    if (user && user.role !== 'property_seeker') {
      return res.status(409).json({ success: false, message: 'This Google account is already registered for another RentSaaS role.' });
    }

    if (!user) {
      user = await User.create({
        name: profile.fullName,
        email: profile.email,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'property_seeker',
        approvalStatus: 'approved',
        avatar: profile.profilePhoto,
        propertySeekerProfile: {
          fullName: profile.fullName,
          email: profile.email,
          googleId: profile.googleId,
          profilePhoto: profile.profilePhoto,
          status: 'active'
        },
        propertySeekerStats: {
          walletBalance: 0,
          remainingViews: 0,
          totalViewsPurchased: 0,
          totalViewsUsed: 0,
          totalSpent: 0,
          lastActiveAt: new Date()
        }
      });
    } else {
      user.name = user.name || profile.fullName;
      user.avatar = profile.profilePhoto || user.avatar;
      user.propertySeekerProfile = {
        ...(user.propertySeekerProfile?.toObject?.() || user.propertySeekerProfile || {}),
        fullName: profile.fullName,
        email: profile.email,
        googleId: profile.googleId,
        profilePhoto: profile.profilePhoto,
        status: 'active'
      };
      user.propertySeekerStats = {
        ...(user.propertySeekerStats?.toObject?.() || user.propertySeekerStats || {}),
        lastActiveAt: new Date()
      };
      user.lastLogin = new Date();
      await user.save();
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        propertySeekerProfile: user.propertySeekerProfile,
        propertySeekerStats: user.propertySeekerStats
      }
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const requireSeeker = (req, res, next) => {
  if (!req.user || req.user.role !== 'property_seeker') {
    return res.status(403).json({ success: false, message: 'Property seeker account required.' });
  }
  next();
};

const getSeekerMe = async (req, res) => {
  try {
    const seeker = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      seeker: {
        _id: seeker._id,
        name: seeker.name,
        email: seeker.email,
        phone: seeker.phone || seeker.propertySeekerProfile?.phoneNumber || '',
        avatar: seeker.avatar || seeker.propertySeekerProfile?.profilePhoto || '',
        profile: seeker.propertySeekerProfile || {},
        stats: seeker.propertySeekerStats || {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSeekerProfile = async (req, res) => {
  try {
    const phoneNumber = cleanString(req.body?.phoneNumber || req.body?.phone, 40);
    const location = cleanString(req.body?.location, 180);
    const preferredSearchArea = cleanString(req.body?.preferredSearchArea, 180);

    if (!phoneNumber || !location) {
      return res.status(400).json({ success: false, message: 'Phone number and current location are required.' });
    }

    const seeker = await User.findById(req.user._id);
    seeker.phone = phoneNumber;
    seeker.propertySeekerProfile = {
      ...(seeker.propertySeekerProfile?.toObject?.() || seeker.propertySeekerProfile || {}),
      phoneNumber,
      location,
      address: location,
      preferredSearchArea,
      preferredLocation: preferredSearchArea
    };
    seeker.propertySeekerStats = {
      ...(seeker.propertySeekerStats?.toObject?.() || seeker.propertySeekerStats || {}),
      lastActiveAt: new Date()
    };
    await seeker.save();

    res.json({ success: true, seeker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPaymentRequest = async (req, res) => {
  try {
    const pricingPlan = await getDefaultPricingPlan();
    const pricePerView = toNumber(pricingPlan?.price || pricingPlan?.monthlyPrice);
    if (!pricingPlan || pricePerView <= 0) {
      return res.status(409).json({ success: false, message: 'Property seeker pricing is not configured yet.' });
    }

    const selectedViews = Math.max(1, Math.floor(toNumber(req.body?.selectedViews, 1)));
    if (selectedViews > 100) {
      return res.status(400).json({ success: false, message: 'Select 100 views or fewer per payment request.' });
    }

    const mobileMoneyNumber = normalizeMobileMoneyNumber(req.body?.mobileMoneyNumber);
    if (!mobileMoneyNumber) {
      return res.status(400).json({ success: false, message: 'Use a valid Mobile Money number such as 07XXXXXXXX or +2567XXXXXXXX.' });
    }

    const requestedMethod = String(req.body?.paymentMethod || 'mtn_mobile_money').toLowerCase();
    const paymentMethod = requestedMethod === 'airtel_money' ? 'airtel_money' : 'mtn_mobile_money';
    const totalAmount = selectedViews * pricePerView;
    const transaction = await BillingTransaction.create({
      transactionId: `PVIEW-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      userId: req.user._id,
      seekerId: req.user._id,
      userType: 'property_seeker',
      planId: pricingPlan._id,
      paymentFor: 'property_view_package',
      chargeType: 'credit_bundle',
      selectedViews,
      pricePerView,
      totalAmount,
      amount: totalAmount,
      currency: 'UGX',
      paymentMethod,
      provider: paymentMethod === 'airtel_money' ? 'airtel' : 'mtn',
      paymentProvider: paymentMethod === 'airtel_money' ? 'airtel' : 'mtn',
      providerStatus: 'gateway_not_connected',
      status: 'pending',
      phoneNumber: mobileMoneyNumber,
      mobileMoneyNumber,
      paymentRequestId: `REQ-${Date.now()}`
    });

    res.status(201).json({
      success: true,
      message: 'Payment request created. Waiting for payment confirmation.',
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        selectedViews,
        pricePerView,
        totalAmount,
        currency: 'UGX',
        paymentMethod,
        mobileMoneyNumber
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const findUnitForUnlock = async (listingId) => {
  if (!isObjectId(listingId)) return null;
  return Unit.findOne({ _id: listingId, deletedAt: null })
    .populate('property')
    .populate('owner', 'name phone whatsAppNumber email');
};

const expireOldUnlocks = async (seekerId, listingId) => {
  await ListingUnlock.updateMany(
    { seekerId, listingId, status: 'active', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );
};

const unlockListing = async (req, res) => {
  try {
    const unit = await findUnitForUnlock(req.params.listingId);
    if (!publishedMarketplaceUnit(unit)) {
      return res.status(404).json({ success: false, message: 'Listing not found or no longer available.' });
    }

    const seeker = await User.findById(req.user._id);
    await expireOldUnlocks(seeker._id, unit._id);

    const activeUnlock = await ListingUnlock.findOne({
      seekerId: seeker._id,
      listingId: unit._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: -1 });

    if (activeUnlock) {
      return res.json({
        success: true,
        unlocked: true,
        alreadyUnlocked: true,
        listing: unlockedListingPayload(unit, activeUnlock, seeker)
      });
    }

    const remainingViews = toNumber(seeker.propertySeekerStats?.walletBalance ?? seeker.propertySeekerStats?.remainingViews);
    let billingTransactionId = null;
    let nextWalletBalance = remainingViews;

    if (!FREE_PROPERTY_UNLOCKS) {
      if (remainingViews <= 0) {
        return res.status(402).json({ success: false, message: 'Payment required', code: 'PAYMENT_REQUIRED', remainingViews: 0 });
      }

      const latestPaidTransaction = await BillingTransaction.findOne({
        userId: seeker._id,
        userType: 'property_seeker',
        status: 'paid',
        deletedAt: null
      }).sort({ paidAt: -1, createdAt: -1 });
      billingTransactionId = latestPaidTransaction?._id || null;
      nextWalletBalance = Math.max(0, remainingViews - 1);
    }

    seeker.propertySeekerStats = {
      ...(seeker.propertySeekerStats?.toObject?.() || seeker.propertySeekerStats || {}),
      walletBalance: nextWalletBalance,
      remainingViews: nextWalletBalance,
      totalViewsUsed: toNumber(seeker.propertySeekerStats?.totalViewsUsed) + 1,
      totalUnlocks: toNumber(seeker.propertySeekerStats?.totalUnlocks) + 1,
      totalViews: toNumber(seeker.propertySeekerStats?.totalViews) + 1,
      lastActiveAt: new Date()
    };
    await seeker.save();

    const unlock = await ListingUnlock.create({
      seekerId: seeker._id,
      userId: seeker._id,
      listingId: unit._id,
      unitId: unit._id,
      propertyId: unit.property._id,
      ownerId: unit.owner?._id || unit.property.owner,
      billingTransactionId,
      unlockedAt: new Date(),
      expiresAt: new Date(Date.now() + UNLOCK_DURATION_MS),
      status: 'active'
    });

    res.json({
      success: true,
      unlocked: true,
      alreadyUnlocked: false,
      listing: unlockedListingPayload(unit, unlock, seeker)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSeekerDashboard = async (req, res) => {
  try {
    await ListingUnlock.updateMany(
      { seekerId: req.user._id, status: 'active', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } }
    );

    const [seeker, unlocks, transactions] = await Promise.all([
      User.findById(req.user._id).select('-password'),
      ListingUnlock.find({ seekerId: req.user._id })
        .populate('propertyId', 'name generalArea location')
        .populate('unitId', 'unitNumber rentAmount')
        .sort({ createdAt: -1 })
        .limit(50),
      BillingTransaction.find({ userId: req.user._id, userType: 'property_seeker', deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(50)
    ]);

    res.json({
      success: true,
      stats: {
        totalViewsPurchased: toNumber(seeker.propertySeekerStats?.totalViewsPurchased),
        remainingViews: toNumber(seeker.propertySeekerStats?.walletBalance ?? seeker.propertySeekerStats?.remainingViews),
        usedViews: toNumber(seeker.propertySeekerStats?.totalViewsUsed),
        totalAmountSpent: toNumber(seeker.propertySeekerStats?.totalSpent)
      },
      unlockedListings: unlocks.map((unlock) => ({
        id: unlock._id,
        listingId: unlock.listingId,
        property: unlock.propertyId?.name || 'N/A',
        unit: unlock.unitId?.unitNumber || 'N/A',
        location: generalLocation(unlock.propertyId),
        amountPaid: 0,
        status: unlock.status,
        unlockedAt: unlock.unlockedAt,
        expiresAt: unlock.expiresAt
      })),
      transactions: transactions.map((transaction) => ({
        id: transaction._id,
        transactionId: transaction.transactionId,
        selectedViews: toNumber(transaction.selectedViews),
        amount: toNumber(transaction.totalAmount ?? transaction.amount),
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        paidAt: transaction.paidAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getGoogleAuthConfig,
  getPublicPricing,
  getPublicVacantListings,
  googleAuth,
  requireSeeker,
  getSeekerMe,
  updateSeekerProfile,
  createPaymentRequest,
  unlockListing,
  getSeekerDashboard
};
