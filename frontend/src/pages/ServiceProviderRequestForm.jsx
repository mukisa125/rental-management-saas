import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, MessageCircle } from 'lucide-react';

const decodePayload = (encodedValue) => {
  if (!encodedValue) return null;

  try {
    const binary = atob(encodedValue);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getBotReply = (issue, message) => {
  const text = String(message || '').toLowerCase();
  const issueText = String(issue || '').toLowerCase();

  if (text.includes('arrival') || text.includes('eta')) {
    return 'Please agree on an exact arrival time and keep both landlord and tenant updated if there is any delay.';
  }
  if (text.includes('cost') || text.includes('price') || text.includes('payment')) {
    return 'Share a clear cost estimate before starting work. Add labor and materials separately to avoid misunderstandings.';
  }
  if (text.includes('access') || text.includes('keys') || text.includes('home')) {
    return 'Confirm access arrangements with the tenant, including who will be present and preferred time window.';
  }
  if (issueText.includes('electrical')) {
    return 'Electrical safety reminder: isolate power before inspection and confirm fixtures are tested after repair.';
  }
  if (issueText.includes('plumbing') || issueText.includes('water')) {
    return 'Plumbing reminder: identify the leak source first and test pressure after repair to ensure no recurrence.';
  }

  return 'Keep messages specific to this issue so both tenant and provider can track progress clearly.';
};

const emptyForm = {
  providerName: '',
  providerTel: '',
  serviceType: '',
  eta: '',
  estimatedCost: '',
  notes: '',
  status: 'accepted'
};

export default function ServiceProviderRequestForm() {
  const location = useLocation();
  const encodedPayload = useMemo(() => new URLSearchParams(location.search).get('data') || '', [location.search]);
  const payload = useMemo(() => decodePayload(encodedPayload), [encodedPayload]);

  const requestId = payload?.issue?.requestId || payload?.issue?.id || 'maintenance-request';
  const formStorageKey = `serviceProviderForm:${requestId}`;
  const chatStorageKey = `serviceProviderChat:${requestId}`;

  const [form, setForm] = useState({
    ...emptyForm,
    providerName: payload?.provider?.name || '',
    providerTel: payload?.provider?.tel || '',
    serviceType: payload?.provider?.service || ''
  });
  const [savedAt, setSavedAt] = useState('');

  const [sender, setSender] = useState('service_provider');
  const [draftMessage, setDraftMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!payload) return;

    try {
      const rawForm = localStorage.getItem(formStorageKey);
      if (rawForm) {
        const parsed = JSON.parse(rawForm);
        setForm((current) => ({ ...current, ...parsed }));
      }

      const rawMessages = localStorage.getItem(chatStorageKey);
      if (rawMessages) {
        const parsedMessages = JSON.parse(rawMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length) {
          setMessages(parsedMessages);
          return;
        }
      }

      setMessages([
        {
          id: `intro-${Date.now()}`,
          sender: 'bot',
          text: 'Issue chat started. Service provider and tenant can coordinate here.',
          createdAt: new Date().toISOString()
        }
      ]);
    } catch {
      setMessages([]);
    }
  }, [payload, chatStorageKey, formStorageKey]);

  useEffect(() => {
    if (!payload) return;
    localStorage.setItem(chatStorageKey, JSON.stringify(messages));
  }, [messages, payload, chatStorageKey]);

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Invalid Request Link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This service provider request link is missing data or has expired. Ask the landlord to generate a new link.
          </p>
        </div>
      </div>
    );
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveForm = (event) => {
    event.preventDefault();
    const payloadToSave = {
      ...form,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(formStorageKey, JSON.stringify(payloadToSave));
    setSavedAt(payloadToSave.updatedAt);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draftMessage.trim();
    if (!text) return;

    const sentAt = new Date().toISOString();
    const userMessage = {
      id: `${sender}-${Date.now()}`,
      sender,
      text,
      createdAt: sentAt
    };

    const botMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: getBotReply(payload?.issue?.title || payload?.issue?.description, text),
      createdAt: new Date(Date.now() + 1000).toISOString()
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setDraftMessage('');
  };

  const landlord = payload.landlord || {};
  const tenant = payload.tenant || {};
  const issue = payload.issue || {};

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-black text-slate-900">Service Provider Assignment Form</h1>
            <p className="mt-1 text-sm text-slate-600">Reference: {issue.requestId || issue.id || 'N/A'}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-sm font-bold text-slate-900">Landlord Details</h2>
                <p className="mt-2 text-sm text-slate-700">Name: {landlord.name || 'N/A'}</p>
                <p className="text-sm text-slate-700">Tel: {landlord.phone || 'N/A'}</p>
                <p className="text-sm text-slate-700">Email: {landlord.email || 'N/A'}</p>
                <p className="text-sm text-slate-700">Company: {landlord.company || 'N/A'}</p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-sm font-bold text-slate-900">Tenant Details</h2>
                <p className="mt-2 text-sm text-slate-700">Name: {tenant.name || 'N/A'}</p>
                <p className="text-sm text-slate-700">Tel: {tenant.phone || 'N/A'}</p>
                <p className="text-sm text-slate-700">Email: {tenant.email || 'N/A'}</p>
                <p className="text-sm text-slate-700">Property/Unit: {tenant.location || 'N/A'}</p>
              </section>
            </div>

            <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-bold text-amber-800">Issue Raised</h2>
              <p className="mt-2 text-sm text-amber-900">Title: {issue.title || 'N/A'}</p>
              <p className="text-sm text-amber-900">Priority: {issue.priority || 'N/A'}</p>
              <p className="text-sm text-amber-900">Description: {issue.description || 'N/A'}</p>
            </section>

            <form onSubmit={saveForm} className="mt-6 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Provider Name
                <input
                  value={form.providerName}
                  onChange={(event) => updateField('providerName', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  required
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Provider Tel
                <input
                  value={form.providerTel}
                  onChange={(event) => updateField('providerTel', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  required
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Service Type
                <input
                  value={form.serviceType}
                  onChange={(event) => updateField('serviceType', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  required
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                ETA
                <input
                  type="datetime-local"
                  value={form.eta}
                  onChange={(event) => updateField('eta', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Estimated Cost
                <input
                  type="number"
                  min="0"
                  value={form.estimatedCost}
                  onChange={(event) => updateField('estimatedCost', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Status
                <select
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="accepted">Accepted</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="cannot_take">Cannot Take</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                Provider Notes
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  placeholder="Share constraints, required parts, or access notes."
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Save Assignment Form
                </button>
                {savedAt && (
                  <p className="text-xs text-slate-500">Saved at {new Date(savedAt).toLocaleString('en-UG')}</p>
                )}
              </div>
            </form>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Tenant-Provider Chatbot
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Use this thread for provider and tenant interaction. Bot gives issue-focused reminders.
          </p>

          <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {messages.length ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.sender === 'service_provider'
                      ? 'ml-8 bg-blue-600 text-white'
                      : message.sender === 'tenant'
                        ? 'mr-8 bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {message.sender === 'service_provider' ? 'Service Provider' : message.sender === 'tenant' ? 'Tenant' : 'Bot'}
                  </p>
                  <p>{message.text}</p>
                  <p className="mt-1 text-[10px] opacity-75">
                    {new Date(message.createdAt).toLocaleString('en-UG')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No messages yet.</p>
            )}
          </div>

          <form onSubmit={sendMessage} className="mt-3 space-y-2">
            <label className="text-xs font-semibold text-slate-600">
              Send as
              <select
                value={sender}
                onChange={(event) => setSender(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="service_provider">Service Provider</option>
                <option value="tenant">Tenant</option>
              </select>
            </label>

            <div className="flex gap-2">
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                placeholder="Type update or question about this issue..."
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
