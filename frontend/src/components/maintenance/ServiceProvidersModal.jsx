import { useEffect, useState } from 'react';
import { X, Pencil, Trash2, Plus } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  service: '',
  tel: '',
  address: ''
};

export default function ServiceProvidersModal({ providers, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');

  useEffect(() => {
    if (!providers.length) {
      setForm(EMPTY_FORM);
      setEditingId('');
    }
  }, [providers]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const service = form.service.trim();
    const tel = form.tel.trim();
    const address = form.address.trim();

    if (!name || !service || !tel || !address) {
      return;
    }

    const payload = {
      id: editingId || `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      service,
      tel,
      address,
      updatedAt: new Date().toISOString()
    };

    const next = editingId
      ? providers.map((provider) => (provider.id === editingId ? payload : provider))
      : [payload, ...providers];

    onSave(next);
    resetForm();
  };

  const startEdit = (provider) => {
    setEditingId(provider.id);
    setForm({
      name: provider.name || '',
      service: provider.service || '',
      tel: provider.tel || '',
      address: provider.address || ''
    });
  };

  const handleDelete = (providerId) => {
    if (!window.confirm('Delete this service provider?')) return;
    onSave(providers.filter((provider) => provider.id !== providerId));
    if (editingId === providerId) {
      resetForm();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Service Providers</h2>
              <p className="text-sm text-slate-500">Manage provider contacts and services</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-3">
            <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Provider' : 'Add Provider'}
              </h3>

              <label className="block text-xs font-semibold text-slate-600">
                Service provider name
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Kampala Fixers Ltd"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                Service
                <input
                  value={form.service}
                  onChange={(event) => updateField('service', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Plumbing"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                Tel
                <input
                  value={form.tel}
                  onChange={(event) => updateField('tel', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="+256700000000"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                Address
                <textarea
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Plot 15, Ntinda Road"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {editingId ? 'Update Provider' : 'Save Provider'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Tel</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.length ? (
                        providers.map((provider) => (
                          <tr key={provider.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-slate-900">{provider.name}</td>
                            <td className="px-4 py-3 text-slate-700">{provider.service}</td>
                            <td className="px-4 py-3 text-slate-700">{provider.tel}</td>
                            <td className="px-4 py-3 text-slate-700">{provider.address}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(provider)}
                                  className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                  title="Edit provider"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(provider.id)}
                                  className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-rose-600"
                                  title="Delete provider"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                            No service providers yet. Add one from the form.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
