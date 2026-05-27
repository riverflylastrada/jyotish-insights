import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  ayanamsa: string;
  chart_style: string;
  house_system: string;
  charts_count: number;
  created_at: string;
  last_sign_in_at: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  async function loadUsers() {
    const { data, error: err } = await supabase.rpc('admin_get_users');
    if (err) { setError(err.message); setLoading(false); return; }
    setUsers((data ?? []) as AdminUser[]);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setToggling(userId);
    const { error: err } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId);
    if (err) {
      toast.error(`Failed to update role: ${err.message}`);
    } else {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    }
    setToggling(null);
  }

  const filtered = users.filter(u => {
    const q = filter.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;

  return (
    <div>
      <h1 className="font-display text-h2 text-text-primary">Users</h1>
      <p className="mt-1 text-sm text-text-muted">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Filter by email or name…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full rounded-md border border-hairline-subtle bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Display Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Charts</th>
              <th className="px-4 py-3">Ayanamsa</th>
              <th className="px-4 py-3">Signed Up</th>
              <th className="px-4 py-3">Last Sign In</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.user_id} className="border-b border-hairline-subtle last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3">{u.display_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === 'admin' ? 'bg-brand-maroon/10 text-brand-maroon' : 'bg-elevated text-text-tertiary'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{u.charts_count}</td>
                <td className="px-4 py-3 capitalize">{u.ayanamsa ?? '—'}</td>
                <td className="px-4 py-3 text-text-muted">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3 text-text-muted">{fmtDate(u.last_sign_in_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleRole(u.user_id, u.role)}
                    disabled={toggling === u.user_id}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-elevated disabled:opacity-50"
                    title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  >
                    {toggling === u.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : u.role === 'admin' ? (
                      <><ShieldOff className="h-3 w-3" />Remove Admin</>
                    ) : (
                      <><ShieldCheck className="h-3 w-3" />Make Admin</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
