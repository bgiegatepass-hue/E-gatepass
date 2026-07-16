const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');

// GET /api/v1/notifications?unreadOnly=true&limit=10
const getNotifications = asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true' || req.query.unread === 'true';
  const limit = Number(req.query.limit || 0);
  const query = { user: req.user._id };
  if (unreadOnly) query.isRead = false;

  const notificationsQuery = Notification.find(query).sort({ createdAt: -1 });
  if (limit > 0) notificationsQuery.limit(limit);

  const [notifications, unreadCount] = await Promise.all([
    notificationsQuery.exec(),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: notifications.map((n) => n.toJSON()),
    unreadCount,
  });
});

// PUT /api/v1/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { isRead: true });
  res.json({ success: true, message: 'Notification marked as read' });
});

// PUT /api/v1/notifications/mark-all-read
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

// GET /api/v1/notifications/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ success: true, data: { count } });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
