import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Bot } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const PROVIDERS = [
  { value: 'google', label: 'Google AI Studio' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'custom', label: 'Custom' },
] as const;

const PROVIDER_DEFAULTS: Record<string, { model: string; endpoint: string; apiKey: string }> = {
  google: {
    model: 'gemini-2.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKey: 'GOOGLE_AI_KEY',
  },
  openrouter: {
    model: 'google/gemini-2.5-flash',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: 'OPENROUTER_KEY',
  },
  openai: {
    model: 'gpt-4o',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'GOOGLE_AI_KEY',
  },
  azure: {
    // Endpoint must be the full deployment URL incl. ?api-version. Replace
    // <resource> with your Azure resource name and <deployment> with your
    // deployment name (see Azure Portal → your resource → Model deployments).
    model: 'gpt-4o', // = your Azure DEPLOYMENT name (sent in the body)
    endpoint: 'https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2024-10-21',
    apiKey: 'AZURE_OPENAI_KEY',
  },
  custom: {
    model: '',
    endpoint: '',
    apiKey: 'GOOGLE_AI_KEY',
  },
};

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  google: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  openrouter: ['google/gemini-2.5-flash', 'anthropic/claude-sonnet-4', 'openai/gpt-4o'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  azure: ['gpt-4o', 'gpt-4.1', 'gpt-4o-mini'],
  custom: [],
};

interface LlmConfig {
  llm_provider: string;
  llm_model: string;
  llm_endpoint: string;
  llm_api_key_setting: string;
}

export default function AdminLlmConfig() {
  const [config, setConfig] = useState<LlmConfig>({
    llm_provider: 'google',
    llm_model: 'gemini-2.5-flash',
    llm_endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    llm_api_key_setting: 'GOOGLE_AI_KEY',
  });
  const [apiKeyOptions, setApiKeyOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [configRes, keysRes] = await Promise.all([
        supabase.from('app_settings').select('key, value').eq('category', 'llm_config'),
        supabase.from('app_settings').select('key').eq('category', 'api_keys'),
      ]);

      if (configRes.error) { setError(configRes.error.message); setLoading(false); return; }

      const configMap: Record<string, string> = {};
      for (const row of configRes.data ?? []) {
        if (row.key && row.value) configMap[row.key] = row.value;
      }

      setConfig({
        llm_provider: configMap['llm_provider'] ?? 'google',
        llm_model: configMap['llm_model'] ?? 'gemini-2.5-flash',
        llm_endpoint: configMap['llm_endpoint'] ?? PROVIDER_DEFAULTS.google.endpoint,
        llm_api_key_setting: configMap['llm_api_key_setting'] ?? 'GOOGLE_AI_KEY',
      });

      setApiKeyOptions((keysRes.data ?? []).map(r => r.key));
      setLoading(false);
    })();
  }, []);

  function onProviderChange(provider: string) {
    const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.custom;
    setConfig({
      llm_provider: provider,
      llm_model: defaults.model,
      llm_endpoint: defaults.endpoint,
      llm_api_key_setting: defaults.apiKey,
    });
  }

  async function saveConfig() {
    setSaving(true);
    const entries = [
      { key: 'llm_provider', value: config.llm_provider },
      { key: 'llm_model', value: config.llm_model },
      { key: 'llm_endpoint', value: config.llm_endpoint },
      { key: 'llm_api_key_setting', value: config.llm_api_key_setting },
    ];

    for (const entry of entries) {
      const { error: err } = await supabase
        .from('app_settings')
        .upsert({ key: entry.key, value: entry.value, category: 'llm_config' }, { onConflict: 'key' });
      if (err) {
        toast.error(`Failed to save ${entry.key}: ${err.message}`);
        setSaving(false);
        return;
      }
    }
    toast.success('LLM configuration saved');
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;

  const suggestions = MODEL_SUGGESTIONS[config.llm_provider] ?? [];

  return (
    <div>
      <h1 className="font-display text-h2 text-text-primary">LLM Configuration</h1>
      <p className="mt-1 text-sm text-text-muted">Configure which AI provider and model to use for the Guru Debate feature.</p>

      {/* Current config summary */}
      <div className="mt-6 rounded-md border border-brand-saffron/30 bg-brand-saffron/5 p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand-saffron" />
          <span className="text-sm font-medium text-text-primary">Current Configuration</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-text-muted">Provider</span>
            <div className="mt-0.5 font-medium capitalize text-text-primary">{config.llm_provider}</div>
          </div>
          <div>
            <span className="text-text-muted">Model</span>
            <div className="mt-0.5 font-mono font-medium text-text-primary">{config.llm_model}</div>
          </div>
          <div>
            <span className="text-text-muted">API Key</span>
            <div className="mt-0.5 font-mono font-medium text-text-primary">{config.llm_api_key_setting}</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-5 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        {/* Provider */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted">LLM Provider</label>
          <select
            value={config.llm_provider}
            onChange={e => onProviderChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted">Model</label>
          <input
            type="text"
            value={config.llm_model}
            onChange={e => setConfig(c => ({ ...c, llm_model: e.target.value }))}
            className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 font-mono text-sm text-text-primary focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
          />
          {suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestions.map(m => (
                <button key={m} onClick={() => setConfig(c => ({ ...c, llm_model: m }))}
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors ${
                    config.llm_model === m
                      ? 'border-brand-saffron bg-brand-saffron/10 text-brand-saffron'
                      : 'border-hairline-subtle text-text-muted hover:border-brand-saffron hover:text-text-primary'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Endpoint */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted">API Endpoint</label>
          <input
            type="text"
            value={config.llm_endpoint}
            onChange={e => setConfig(c => ({ ...c, llm_endpoint: e.target.value }))}
            className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 font-mono text-xs text-text-primary focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
          />
          {config.llm_provider === 'azure' && (
            <p className="mt-1 text-xs text-text-muted">
              Azure: paste the full deployment URL — <span className="font-mono">https://&lt;resource&gt;.openai.azure.com/openai/deployments/&lt;deployment&gt;/chat/completions?api-version=2024-10-21</span>.
              Set <strong>Model</strong> above to your deployment name.
            </p>
          )}
        </div>

        {/* API Key Setting */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted">API Key Setting</label>
          <select
            value={config.llm_api_key_setting}
            onChange={e => setConfig(c => ({ ...c, llm_api_key_setting: e.target.value }))}
            className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
          >
            {apiKeyOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <p className="mt-1 text-xs text-text-muted">Selects which API key from the API Keys page to use for this provider.</p>
        </div>

        {/* Save */}
        <button
          onClick={saveConfig}
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
