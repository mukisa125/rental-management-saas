const Payment = require('../models/Payment');

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Build a human-readable billing label, e.g. "Rent for July 2026".
 * @param {{ month: number, year: number }} period
 */
const paymentForLabel = ({ month, year } = {}) => {
  if (!month || !year) return '';
  return `Rent for ${MONTH_NAMES[month - 1]} ${year}`;
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Return an existing non-void payment for the same tenant + paymentFor label,
 * or null if none found.  Used to block duplicate payment entries.
 *
 * @param {object}  scope     - MongoDB filter that scopes the query (owner / company).
 * @param {*}       tenantId  - Tenant ObjectId or string.
 * @param {string}  paymentFor - The billing label to check.
 */
const checkPaymentDuplicate = async (scope, tenantId, paymentFor) => {
  if (!paymentFor) return null;
  const { deletedAt: _ignored, ...filter } = scope;
  return Payment.findOne({
    ...filter,
    tenant: tenantId,
    paymentFor: { $regex: new RegExp(`^${escapeRegex(paymentFor)}$`, 'i') },
    status: { $nin: ['cancelled', 'reversed', 'failed'] },
    deletedAt: null
  }).select('_id status paymentFor').lean();
};

// ─── overdue refresh ─────────────────────────────────────────────────────────

/**
 * Mark pending/partial payments as overdue when their dueDate is before today
 * and they have not been fully paid.
 *
 * @param {object} scope - MongoDB query filter that scopes which payments to
 *   inspect.  Pass { owner: ownerId } for a landlord, the full
 *   tenantDataScope(tenant) object for a tenant portal call, or {} to update
 *   every payment in the database (used by the daily cron job).
 */
const refreshOverduePayments = async (scope = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Remove a deletedAt key that might already be present in the scope to avoid
  // conflicting with the explicit null check we add below.
  const { deletedAt: _ignored, ...filter } = scope;

  await Payment.updateMany(
    {
      ...filter,
      deletedAt: null,
      status: { $in: ['pending', 'partial'] },
      dueDate: { $lt: today },
      $expr: { $lt: ['$amountPaid', '$amount'] }
    },
    { $set: { status: 'overdue' } }
  );
};

module.exports = { refreshOverduePayments, paymentForLabel, checkPaymentDuplicate };
