import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Loader2, Trash2, ArrowRight, BookOpen, PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface Row {
  id: string;
  name: string;
  birth_details: any;
  share_token: string;
  created_at: string;
}

export default function Library() {
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('charts')
      .select('id,name,birth_details,share_token,created_at')
      .order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Delete this chart? This cannot be undone.')) return;
    const { error } = await supabase.from('charts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Chart deleted');
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  };

  if (rows === null) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">Library</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Your saved charts</h1>
      <p className="mt-2 text-body text-text-secondary">Every chart you save lives here. Open, share, or delete at any time.</p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-md border border-dashed border-hairline-subtle bg-surface p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-text-tertiary" />
          <div className="mt-3 font-display text-h3 text-text-primary">No charts yet</div>
          <p className="mt-2 text-sm text-text-tertiary">Cast your first kundli to start building your library.</p>
          <Link to="/app/new" className="mt-6 inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
            <PlusCircle className="h-4 w-4" /> New chart
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-hairline-subtle rounded-md border border-hairline-subtle bg-surface shadow-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="font-display text-h3 text-text-primary truncate">{r.name}</div>
                <div className="font-mono text-xs text-text-tertiary truncate">
                  {r.birth_details?.dateOfBirth}{r.birth_details?.timeOfBirth ? ` · ${r.birth_details.timeOfBirth}` : ''} · {r.birth_details?.placeOfBirth?.name ?? '—'}
                </div>
                <div className="font-mono text-[10px] text-text-muted">Saved {dayjs(r.created_at).format('DD MMM YYYY')}</div>
              </div>
              <button onClick={() => remove(r.id)} className="rounded-sm p-2 text-text-tertiary hover:bg-elevated hover:text-semantic-negative" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
              <Link to={`/app/chart/${r.id}`} className="inline-flex items-center gap-1 rounded-sm bg-brand-maroon px-3 py-1.5 text-sm text-primary-foreground hover:bg-brand-maroon/90">
                Open <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}