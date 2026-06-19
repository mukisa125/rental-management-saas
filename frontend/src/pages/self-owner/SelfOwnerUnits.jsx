import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SelfOwnerUnits() {
  const [units, setUnits] = useState([]);
  useEffect(() => { api.get('/self-owner/units').then(({ data }) => setUnits(data.units || [])).catch(() => setUnits([])); }, []);
  return <div className="min-h-full bg-[#f8fbff] p-6 lg:p-8"><p className="text-sm font-semibold text-blue-600">Dashboard / Units</p><h2 className="mt-1 text-2xl font-black text-slate-950">Units</h2><div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Unit</th><th className="p-4">Property</th><th className="p-4">Status</th></tr></thead><tbody>{units.map((unit) => <tr key={unit._id} className="border-t"><td className="p-4 font-bold">{unit.unitNumber}</td><td className="p-4">{unit.property?.name}</td><td className="p-4 capitalize">{unit.status}</td></tr>)}</tbody></table></div></div>;
}
