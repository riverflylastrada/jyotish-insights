import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Mic, Clock, Users, CalendarDays } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { VOICE_GURUS } from '@/config/guruVoices';

interface VoiceStats {
  total_sessions: number;
  total_minutes: number;
  sessions_today: number;
  minutes_today: number;
  unique_users: number;
  by_guru: Record<string, number>;
  by_language: Record<string, number>;
}

// Editable app_settings rows (category 'voice').
const BASE_KEYS = [
  { key: 'elevenlabs_agent_id', label: 'ElevenLabs Agent ID', hint: 'Single base agent (tools + KB configured here).' },
  { key: 'elevenlabs_default_guru', label: 'Default Guru', hint: 'Persona when none selected.' },
  { key: 'elevenlabs_default_language', label: 'Default Language', hint: 'e.g. hi, en.' },
  { key: 'voice_monthly_minutes_cap', label: 'Monthly Minutes Cap (soft)', hint: 'Advisory cap reported by get-usage.' },
];

export default function AdminVoice() {
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [statsRes, settingsRes] = await Promise.all([
        // Cast until supabase types are regenerated post-migration (admin_get_voice_stats is new).
        (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>)('admin_get_voice_stats'),
        supabase.from('app_settings').select('key, value').eq('category', 'voice'),
      ]);
      if (statsRes.error) setStatsError(statsRes.error.message);
      else setStats(statsRes.data as unknown as VoiceStats);

      const map: Record<string, string> = {};
      for (const row of settingsRes.data ?? []) if (row.key) map[row.key] = row.value ?? '';
      setValues(map);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const keys = [
      ...BASE_KEYS.map((k) => k.key),
      ...VOICE_GURUS.flatMap((g) => [
        `elevenlabs_voice_id_${g.id}`,
        `elevenlabs_voice_speed_${g.id}`,
        `elevenlabs_voice_stability_${g.id}`,
        `elevenlabs_voice_similarity_${g.id}`,
      ]),
    ];
    for (const key of keys) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value: values[key] ?? '', category: 'voice' }, { onConflict: 'key' });
      if (error) { toast.error(`Failed to save ${key}: ${error.message}`); setSaving(false); return; }
    }
    toast.success('Voice configuration saved');
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;

  const field = (key: string) => (
    <input
      type="text"
      value={values[key] ?? ''}
      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 font-mono text-xs text-text-primary focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
    />
  );

  const cards = stats
    ? [
        { label: 'Total Sessions', value: stats.total_sessions, icon: Mic, color: 'text-brand-maroon' },
        { label: 'Total Minutes', value: stats.total_minutes, icon: Clock, color: 'text-brand-saffron' },
        { label: 'Sessions Today', value: stats.sessions_today, icon: CalendarDays, color: 'text-semantic-positive' },
        { label: 'Unique Users', value: stats.unique_users, icon: Users, color: 'text-semantic-info' },
      ]
    : [];

  return (
    <div>
      <h1 className="font-display text-h2 text-text-primary">Voice Guru</h1>
      <p className="mt-1 text-sm text-text-muted">
        Voice session analytics and ElevenLabs agent / voice configuration. The ElevenLabs <span className="font-medium">API key</span> and{' '}
        <span className="font-medium">webhook secret</span> are managed on the <a href="/admin/api-keys" className="text-brand-saffron hover:underline">API Keys</a> page.
      </p>

      {/* Stats */}
      {statsError ? (
        <div className="mt-6 rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{statsError}</div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`mt-2 font-display text-h1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {stats && Object.keys(stats.by_guru ?? {}).length > 0 && (
        <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-4 text-sm">
          <span className="text-xs uppercase tracking-wider text-text-muted">Sessions by Guru</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(stats.by_guru).map(([g, n]) => (
              <span key={g} className="rounded-full border border-hairline-subtle px-2.5 py-0.5 text-xs text-text-primary">{g}: {n}</span>
            ))}
          </div>
        </div>
      )}

      {/* Config editor */}
      <div className="mt-8 space-y-5 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <h2 className="font-display text-h3 text-text-primary">Agent & Voices</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BASE_KEYS.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</label>
              {field(key)}
              <p className="mt-1 text-xs text-text-muted">{hint}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline-subtle pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Per-Guru Voice IDs</p>
          <p className="text-xs text-text-muted">A guru becomes usable once it is marked available in code; set its ElevenLabs voice id here.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {VOICE_GURUS.map((g) => (
              <div key={g.id} className="rounded-md border border-hairline-subtle/60 p-3">
                <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <span aria-hidden>{g.icon}</span> {g.name}
                  {!g.available && <span className="text-[10px] uppercase text-text-tertiary">(coming soon)</span>}
                </label>
                {field(`elevenlabs_voice_id_${g.id}`)}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([
                    ['speed', 'Speed'],
                    ['stability', 'Stability'],
                    ['similarity', 'Similarity'],
                  ] as const).map(([k, lbl]) => (
                    <div key={k}>
                      <span className="text-[10px] uppercase tracking-wide text-text-muted">{lbl}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={values[`elevenlabs_voice_${k}_${g.id}`] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [`elevenlabs_voice_${k}_${g.id}`]: e.target.value }))}
                        placeholder="default"
                        className="mt-0.5 w-full rounded-md border border-hairline-subtle bg-canvas px-2 py-1 font-mono text-xs text-text-primary focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-text-muted">0.7–1.2 speed · 0–1 stability/similarity · blank = built-in default</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-brand-saffron px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-saffron-hover disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}
