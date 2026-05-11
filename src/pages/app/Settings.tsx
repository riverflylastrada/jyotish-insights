import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useSession } from '@/hooks/useSession';

type Prefs = {
  display_name: string;
  ayanamsa: 'lahiri' | 'raman' | 'krishnamurti' | 'yukteshwar';
  chart_style: 'north' | 'south';
  house_system: 'whole_sign' | 'placidus' | 'koch' | 'equal';
};

const DEFAULTS: Prefs = { display_name: '', ayanamsa: 'lahiri', chart_style: 'north', house_system: 'whole_sign' };

export default function Settings() {
  const { user } = useSession();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name,ayanamsa,chart_style,house_system')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) { toast.error(error.message); setPrefs(DEFAULTS); return; }
      setPrefs({ ...DEFAULTS, ...(data ?? {}) } as Prefs);
    })();
  }, [user]);

  const save = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Preferences saved');
  };

  if (!prefs) {
    return <div className="mx-auto max-w-3xl px-6 py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">Settings</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Preferences</h1>
      <p className="mt-2 text-body text-text-secondary">These defaults apply to every new chart you cast.</p>

      <div className="mt-8 space-y-5 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <Field label="Display name">
          <input className="settings-input" value={prefs.display_name ?? ''}
            onChange={(e) => setPrefs({ ...prefs, display_name: e.target.value })} />
        </Field>
        <Field label="Ayanamsa">
          <select className="settings-input" value={prefs.ayanamsa}
            onChange={(e) => setPrefs({ ...prefs, ayanamsa: e.target.value as Prefs['ayanamsa'] })}>
            <option value="lahiri">Lahiri (default)</option>
            <option value="raman">Raman</option>
            <option value="krishnamurti">Krishnamurti</option>
            <option value="yukteshwar">Yukteshwar</option>
          </select>
        </Field>
        <Field label="Chart style">
          <select className="settings-input" value={prefs.chart_style}
            onChange={(e) => setPrefs({ ...prefs, chart_style: e.target.value as Prefs['chart_style'] })}>
            <option value="north">North Indian</option>
            <option value="south">South Indian</option>
          </select>
        </Field>
        <Field label="House system">
          <select className="settings-input" value={prefs.house_system}
            onChange={(e) => setPrefs({ ...prefs, house_system: e.target.value as Prefs['house_system'] })}>
            <option value="whole_sign">Whole Sign (default)</option>
            <option value="placidus">Placidus</option>
            <option value="koch">Koch</option>
            <option value="equal">Equal</option>
          </select>
        </Field>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save preferences
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-5 text-sm text-text-tertiary">
        Signed in as <span className="font-mono text-text-primary">{user?.email}</span>
      </div>

      <style>{`.settings-input { width: 100%; border: 1px solid hsl(var(--input)); background: hsl(var(--bg-surface)); border-radius: 3px; padding: 0.55rem 0.75rem; font-size: 14px; color: hsl(var(--text-primary)); outline: none; }
.settings-input:focus { border-color: hsl(var(--brand-saffron)); box-shadow: 0 0 0 3px hsl(var(--brand-saffron) / 0.12); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-eyebrow mb-2 text-text-tertiary">{label}</div>
      {children}
    </label>
  );
}