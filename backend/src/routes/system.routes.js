const express = require('express');
const router = express.Router();
const { getBanners, updateBanners } = require('../controllers/system.controller');
const { authRequired, adminRequired } = require('../middleware/auth.middleware');

const { saveFcmToken, removeFcmToken, sendTestNotification } = require('../controllers/notification.controller');

// Public/User access to see banners
router.get('/banners', getBanners);

// Admin only access to manage banners
router.post('/banners', authRequired, adminRequired, updateBanners);

// Notification Token Management
router.post('/save-fcm-token', authRequired, saveFcmToken);
router.post('/remove-fcm-token', authRequired, removeFcmToken);
router.get('/test-notification', authRequired, sendTestNotification);

module.exports = router;
