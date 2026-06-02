import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2, Trash2, ArrowRight, BookOpen, PlusCircle, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { toast } from '@/components/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB birth_details (matches Supabase Json)
  birth_details: any;
  share_token: string;
  created_at: string;
}

export default function Library() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const load = async () => {
    const [{ data, error }, { data: profile }] = await Promise.all([
      supabase
        .from('charts')
        .select('id,name,birth_details,share_token,created_at')
        .order('created_at', { ascending: false }),
      user
        ? supabase.from('profiles').select('default_chart_id').eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (error) { toast.error(error.message); return; }
    setRows(data ?? []);
    setDefaultId(profile?.default_chart_id ?? null);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Toggle a chart as the user's default. Clicking the current default clears it.
  const setDefault = async (id: string) => {
    if (!user) return;
    const next = defaultId === id ? null : id;
    setDefaultId(next); // optimistic
    const { error } = await supabase
      .from('profiles')
      .update({ default_chart_id: next })
      .eq('user_id', user.id);
    if (error) { setDefaultId(defaultId); toast.error(error.message); return; }
    toast.success(next ? 'Set as your default chart' : 'Default chart cleared');
    // refresh the resolver used by the Voice Guru entries
    queryClient.invalidateQueries({ queryKey: ['default-chart'] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('charts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Chart deleted');
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    // DB clears default_chart_id via ON DELETE SET NULL; mirror it locally.
    if (defaultId === id) {
      setDefaultId(null);
      queryClient.invalidateQueries({ queryKey: ['default-chart'] });
    }
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
                <div className="flex items-center gap-2">
                  <span className="font-display text-h3 text-text-primary truncate">{r.name}</span>
                  {defaultId === r.id && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-saffron/15 px-2 py-0.5 text-[10px] font-medium text-brand-saffron">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-text-tertiary truncate">
                  {r.birth_details?.dateOfBirth}{r.birth_details?.timeOfBirth ? ` · ${r.birth_details.timeOfBirth}` : ''} · {r.birth_details?.placeOfBirth?.name ?? '—'}
                </div>
                <div className="font-mono text-[10px] text-text-muted">Saved {dayjs(r.created_at).format('DD MMM YYYY')}</div>
              </div>
              <button
                onClick={() => setDefault(r.id)}
                className={cn(
                  'rounded-sm p-2 transition-colors',
                  defaultId === r.id
                    ? 'text-brand-saffron hover:bg-elevated'
                    : 'text-text-tertiary hover:bg-elevated hover:text-brand-saffron',
                )}
                title={defaultId === r.id ? 'Default chart — click to clear' : 'Set as default chart'}
                aria-label={defaultId === r.id ? 'Clear default chart' : 'Set as default chart'}
              >
                <Star className={cn('h-4 w-4', defaultId === r.id && 'fill-current')} />
              </button>
              <button onClick={() => setPendingDelete(r)} className="rounded-sm p-2 text-text-tertiary hover:bg-elevated hover:text-semantic-negative" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
              <Link to={`/app/chart/${r.id}`} className="inline-flex items-center gap-1 rounded-sm bg-brand-maroon px-3 py-1.5 text-sm text-primary-foreground hover:bg-brand-maroon/90">
                Open <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {pendingDelete?.name ?? 'this chart'}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) remove(pendingDelete.id); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}