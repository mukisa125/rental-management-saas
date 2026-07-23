import FormField from './FormField';
import ToggleSwitch from './ToggleSwitch';

export default function PreferencesSettingsTab({ data, onChange, onReset }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">General Preferences</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Language" value={data.language} onChange={(value) => onChange('language', value)} />
          <FormField
            label="Theme"
            value={data.theme}
            onChange={(value) => onChange('theme', value)}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
          />
          <FormField label="Date Format" value={data.dateFormat} onChange={(value) => onChange('dateFormat', value)} />
          <FormField
            label="Time Format"
            value={data.timeFormat}
            onChange={(value) => onChange('timeFormat', value)}
            options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
          />
          <FormField label="Currency" value={data.currency} onChange={(value) => onChange('currency', value)} />
          <FormField label="Currency Format" value={data.currencyFormat} onChange={(value) => onChange('currencyFormat', value)} />
          <FormField label="Default Dashboard View" value={data.defaultDashboardView} onChange={(value) => onChange('defaultDashboardView', value)} />
          <FormField label="Rows Per Page" type="number" min={5} max={200} value={data.rowsPerPage} onChange={(value) => onChange('rowsPerPage', Number(value) || 25)} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <ToggleSwitch label="Compact Table View" checked={data.compactTableView} onChange={(value) => onChange('compactTableView', value)} />
          <ToggleSwitch label="Enable Keyboard Shortcuts" checked={data.enableKeyboardShortcuts} onChange={(value) => onChange('enableKeyboardShortcuts', value)} />
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Reset to Defaults
      </button>
    </div>
  );
}
