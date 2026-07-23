const User = require('../models/User');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isViewCreditTransaction = (transaction) => (
  transaction
  && transaction.userType === 'property_seeker'
  && ['property_view_package', 'per_view_charge', 'credit_bundle'].includes(String(transaction.paymentFor || '').toLowerCase())
  && toNumber(transaction.selectedViews) > 0
);

const applyPurchasedViewCredits = async (transaction) => {
  if (!isViewCreditTransaction(transaction) || transaction.creditsAppliedAt) {
    return false;
  }

  const selectedViews = Math.max(0, Math.floor(toNumber(transaction.selectedViews)));
  const amount = toNumber(transaction.totalAmount ?? transaction.amount);
  if (!selectedViews) return false;

  await User.updateOne(
    { _id: transaction.seekerId || transaction.userId, role: 'property_seeker', deletedAt: null },
    {
      $inc: {
        'propertySeekerStats.walletBalance': selectedViews,
        'propertySeekerStats.remainingViews': selectedViews,
        'propertySeekerStats.totalViewsPurchased': selectedViews,
        'propertySeekerStats.totalSpent': amount
      },
      $set: {
        'propertySeekerStats.lastActiveAt': new Date()
      }
    }
  );

  transaction.creditsAppliedAt = new Date();
  await transaction.save();
  return true;
};

module.exports = {
  applyPurchasedViewCredits,
  isViewCreditTransaction
};
