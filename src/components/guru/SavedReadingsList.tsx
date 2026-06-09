import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, MessageSquare, Users, Gavel, Clock, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChartLink } from '@/hooks/useChartLink';
import { GURU_BY_KEY } from '@/lib/guru/guruRoster';
import { useSavedReadings, deleteReading, type SavedReading } from '@/hooks/useSavedReadings';

const KIND_META: Record<string, { label: string; Icon: typeof MessageSquare }> = {
  single:  { label: 'Single Guru', Icon: MessageSquare },
  debate:  { label: 'Tribunal',    Icon: Users },
  prashna: { label: 'Prashna',     Icon: Gavel },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function guruNames(keys: string[]): string {
  return keys.map((k) => GURU_BY_KEY[k as keyof typeof GURU_BY_KEY]?.name.split(' ').pop() ?? k).join(', ');
}

/** Resolve chart_id → person name for the global view (owner-scoped via RLS). */
function useChartNames(enabled: boolean) {
  return useQuery<Record<string, string>>({
    queryKey: ['chart_names'],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from('charts').select('id,name');
      const map: Record<string, string> = {};
      (data ?? []).forEach((c) => { map[(c as { id: string }).id] = (c as { name: string }).name; });
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });
}

function ReadingRow({ r, chartName, showSubject }: { r: SavedReading; chartName?: string; showSubject: boolean }) {
  const chartLink = useChartLink();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = KIND_META[r.kind] ?? KIND_META.single;
  const verdict = r.answer?.verdict;
  const readings = r.answer?.readings ?? [];

  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try { await deleteReading(r.id); } catch { setDeleting(false); }
  };

  return (
    <div className="rounded-md border border-hairline-subtle bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-elevated"
      >
        <meta.Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-maroon" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">{r.question}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xxs text-text-tertiary">
            <span>{meta.label}</span>
            <span>·</span>
            <span>{guruNames(r.gurus)}</span>
            {showSubject && (
              <>
                <span>·</span>
                <span className="text-brand-maroon">{r.chart_id ? (chartName ?? 'Chart') : 'Horary'}</span>
              </>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(r.created_at)}</span>
          </div>
        </div>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-hairline-subtle px-4 py-3">
          {verdict && (
            <div className="rounded-sm border border-brand-gold/30 bg-brand-gold/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-brand-gold">
                <Gavel className="h-3.5 w-3.5" /> The Acharya's verdict
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{verdict}</p>
            </div>
          )}
          {readings.map((rd, i) => (
            <div key={i}>
              <div className="mb-0.5 font-display text-xs text-text-primary">{rd.guru}</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{rd.text}</p>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-hairline-subtle pt-2.5">
            {r.chart_id ? (
              <Link to={chartLink(`/app/chart/${r.chart_id}/debate`)} className="text-xs text-text-tertiary hover:text-brand-maroon">
                Open this chart's Guru room →
              </Link>
            ) : <span />}
            <button
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-semantic-negative disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lists saved Guru readings with expand-to-read. Pass `chartId` for the per-chart
 * panel (scopes to one chart, hides the redundant name); omit it for the global
 * My Readings page (shows whose chart each reading belongs to).
 */
export function SavedReadingsList({ chartId, emptyHint }: { chartId?: string; emptyHint?: string }) {
  const { data: readings, isLoading } = useSavedReadings(chartId);
  const { data: names } = useChartNames(!chartId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-text-tertiary">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!readings || readings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-tertiary">
        {emptyHint ?? 'No saved readings yet. Your answers will appear here.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {readings.map((r) => (
        <ReadingRow key={r.id} r={r} chartName={r.chart_id ? names?.[r.chart_id] : undefined} showSubject={!chartId} />
      ))}
    </div>
  );
}
