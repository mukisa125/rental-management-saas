const express = require('express');
const { protect } = require('../middleware/rbacMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:notificationId/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:notificationId', deleteNotification);

module.exports = router;
