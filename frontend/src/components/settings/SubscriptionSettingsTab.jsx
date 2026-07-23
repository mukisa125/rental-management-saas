import { formatDateTime, formatMoney, safeNumber, safeText } from './settingsUtils';

const UsageCard = ({ label, used, limit }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-900">
      {safeNumber(used, 0).toLocaleString('en-UG')} / {limit === null || limit === undefined ? 'Unlimited' : safeNumber(limit, 0).toLocaleString('en-UG')}
    </p>
  </div>
);

export default function SubscriptionSettingsTab({ subscription, usage, paymentHistory }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Current Subscription</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 text-xs text-slate-600">
          <p><span className="font-semibold text-slate-700">Current Plan:</span> {safeText(subscription?.planName, 'Trial')}</p>
          <p><span className="font-semibold text-slate-700">Plan Status:</span> {safeText(subscription?.status, 'trial')}</p>
          <p><span className="font-semibold text-slate-700">Billing Cycle:</span> {safeText(subscription?.billingCycle, 'monthly')}</p>
          <p><span className="font-semibold text-slate-700">Next Billing Date:</span> {formatDateTime(subscription?.nextBillingDate)}</p>
          <p><span className="font-semibold text-slate-700">Subscription Start Date:</span> {formatDateTime(subscription?.subscriptionStartDate)}</p>
          <p><span className="font-semibold text-slate-700">Subscription Expiry Date:</span> {formatDateTime(subscription?.subscriptionExpiryDate)}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Upgrade Plan</button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Renew Plan</button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Contact Support</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <UsageCard label="Properties Used / Limit" used={usage?.propertiesUsed} limit={usage?.propertiesLimit} />
        <UsageCard label="Units Used / Limit" used={usage?.unitsUsed} limit={usage?.unitsLimit} />
        <UsageCard label="Tenants Used / Limit" used={usage?.tenantsUsed} limit={usage?.tenantsLimit} />
        <UsageCard label="Storage Used (bytes) / Limit" used={usage?.storageUsed} limit={usage?.storageLimit} />
        <UsageCard label="Documents Used / Limit" used={usage?.documentsUsed} limit={usage?.documentsLimit} />
        <UsageCard label="WhatsApp Messages Used / Limit" used={usage?.whatsappMessagesUsed} limit={usage?.whatsappMessagesLimit} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
        </div>
        {!paymentHistory?.length ? (
          <p className="px-4 py-6 text-sm text-slate-500">No subscription payment history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-3">{safeText(row.invoiceId)}</td>
                    <td className="px-4 py-3">{safeText(row.plan)}</td>
                    <td className="px-4 py-3">{formatMoney(row.amount, 'UGX')}</td>
                    <td className="px-4 py-3">{safeText(row.paymentMethod)}</td>
                    <td className="px-4 py-3">{safeText(row.status)}</td>
                    <td className="px-4 py-3">{formatDateTime(row.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button type="button" className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">View</button>
                        <button type="button" className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Download</button>
                        <button type="button" className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Upgrade</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
