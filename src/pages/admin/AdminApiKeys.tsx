import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface ApiKeySetting {
  id: string;
  key: string;
  value: string | null;
  label: string | null;
  description: string | null;
  is_secret: boolean;
}

export default function AdminApiKeys() {
  const [settings, setSettings] = useState<ApiKeySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await (supabase as any)
        .from('app_settings')
        .select('*')
        .eq('category', 'api_keys')
        .order('key');
      if (err) { setError(err.message); setLoading(false); return; }
      const rows = (data ?? []) as ApiKeySetting[];
      setSettings(rows);
      const init: Record<string, string> = {};
      for (const r of rows) init[r.key] = r.value ?? '';
      setValues(init);
      setLoading(false);
    })();
  }, []);

  function maskValue(val: string): string {
    if (!val || val.length < 8) return val ? '••••••••' : '';
    return val.slice(0, 4) + '••••' + val.slice(-4);
  }

  async function save(settingKey: string) {
    setSaving(settingKey);
    const { error: err } = await (supabase as any)
      .from('app_settings')
      .upsert({ key: settingKey, value: values[settingKey], category: 'api_keys' }, { onConflict: 'key' });
    if (err) {
      toast.error(`Failed to save: ${err.message}`);
    } else {
      toast.success(`${settingKey} saved`);
      setVisible(v => ({ ...v, [settingKey]: false }));
    }
    setSaving(null);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-h2 text-text-primary">API Keys</h1>
      <p className="mt-1 text-sm text-text-muted">Manage API keys used by edge functions. Values are stored securely and only accessible to admins.</p>

      <div className="mt-6 space-y-4">
        {settings.map(s => {
          const isVisible = visible[s.key] ?? false;
          const currentValue = values[s.key] ?? '';
          const hasExisting = !!(s.value && s.value.length > 0);

          return (
            <div key={s.key} className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">{s.label ?? s.key}</h3>
                  {s.description && <p className="mt-0.5 text-xs text-text-muted">{s.description}</p>}
                </div>
                {hasExisting && !isVisible && (
                  <span className="rounded bg-semantic-positive/10 px-2 py-0.5 font-mono text-xs text-semantic-positive">
                    {maskValue(s.value!)}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={s.is_secret && !isVisible ? 'password' : 'text'}
                    value={currentValue}
                    onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                    placeholder={hasExisting ? 'Enter new value to update…' : 'Paste your API key…'}
                    className="w-full rounded-md border border-hairline-subtle bg-canvas py-2 pl-3 pr-10 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
                  />
                  {s.is_secret && (
                    <button
                      type="button"
                      onClick={() => setVisible(v => ({ ...v, [s.key]: !isVisible }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => save(s.key)}
                  disabled={saving === s.key || !currentValue}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-saffron px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-saffron-hover disabled:opacity-50"
                >
                  {saving === s.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
            </div>
          );
        })}
        {settings.length === 0 && (
          <div className="py-8 text-center text-text-muted">No API key settings found. Run the migration first.</div>
        )}
      </div>
    </div>
  );
}
