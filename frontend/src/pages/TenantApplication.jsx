import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import TenantWizard from './self-owner/TenantWizard';

export default function TenantApplication() {
  const { token } = useParams();
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadApplication = async () => {
      try {
        const response = await api.get(`/tenant-applications/public/${token}`);
        setApplication(response.data.application);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to open this tenant application.');
      } finally { setLoading(false); }
    };
    loadApplication();
  }, [token]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-600"><div className="inline-flex items-center gap-2 text-sm font-semibold"><LoaderCircle className="h-5 w-5 animate-spin" />Opening tenant application...</div></div>;
  if (error) return <PublicMessage icon={Building2} title="This application link is unavailable" message={error} />;
  if (submitted) return <PublicMessage icon={CheckCircle2} title="Application submitted" message="Thank you. The property owner will review your details and contact you after making a decision." success />;

  const { property, unit } = application;
  return <TenantWizard
    page
    title={`Apply for Unit ${unit.unitNumber}`}
    description={`${property.name}${property.location ? ` · ${property.location}` : ''}. Complete each tab and submit your application for the owner's review.`}
    properties={[property]}
    units={[unit]}
    initialForm={{ property: property._id, unit: unit._id, rentAmount: unit.rentAmount || '', securityDeposit: unit.depositAmount || '' }}
    allocationLocked
    submitLabel="Submit Application"
    onSave={async (payload) => {
      await api.post(`/tenant-applications/public/${token}`, payload);
      setSubmitted(true);
    }}
  />;
}

function PublicMessage({ icon: Icon, title, message, success = false }) {
  return <div className="grid min-h-screen place-items-center bg-slate-100 p-5"><section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl"><span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><Icon className="h-7 w-7" /></span><h1 className="mt-5 text-xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p></section></div>;
}
