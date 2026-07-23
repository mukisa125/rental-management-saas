const Notification = require('../models/Notification');
const mongoose = require('mongoose');

const getCompanyId = (req) => req.company?._id || req.user?.company;

const userNotificationFilter = (req, extra = {}) => {
  const filter = {
    user: req.user._id,
    deletedAt: null,
    ...extra
  };
  const company = getCompanyId(req);
  if (company) filter.company = company;
  return filter;
};

// Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const { isRead } = req.query;

    const filter = userNotificationFilter(req);
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments(userNotificationFilter(req, { isRead: false }));

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await Notification.findOneAndUpdate(
      userNotificationFilter(req, { _id: notificationId }),
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      userNotificationFilter(req, { isRead: false }),
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await Notification.findOneAndUpdate(
      userNotificationFilter(req, { _id: notificationId }),
      { deletedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create notification (internal use)
const createNotification = async (company, userId, title, message, type, relatedEntity) => {
  try {
    const notification = await Notification.create({
      company,
      user: userId,
      title,
      message,
      type,
      relatedEntity
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};
