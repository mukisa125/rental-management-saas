import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SelfOwnerNotices() {
  const [notices, setNotices] = useState([]);
  useEffect(() => { api.get('/self-owner/notices').then(({ data }) => setNotices(data.documents || [])).catch(() => setNotices([])); }, []);
  return <div className="min-h-full bg-[#f8fbff] p-6 lg:p-8"><p className="text-sm font-semibold text-blue-600">Dashboard / Notices</p><h2 className="mt-1 text-2xl font-black text-slate-950">Notices</h2><div className="mt-6 space-y-3">{notices.map((notice) => <article key={notice._id} className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">{notice.title}</h3><p className="mt-2 text-sm text-slate-600">{notice.description}</p></article>)}</div></div>;
}
