import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies before importing component
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signOut: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) })),
  },
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ user: { id: 'test-user', email: 'test@example.com' }, session: {} }),
}));

vi.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: false }),
}));

vi.mock('@/hooks/usePlanGate', () => ({
  usePlanGate: () => true,
}));

vi.mock('@/components/chart/StaleSnapshotBanner', () => ({
  StaleSnapshotBanner: () => null,
}));

const mockUnreadCount = vi.fn(() => 0);
vi.mock('@/hooks/useTransitAlerts', () => ({
  useTransitAlerts: () => ({
    alerts: [],
    isLoading: false,
    unreadCount: mockUnreadCount(),
    markRead: { mutate: vi.fn() },
    markAllRead: { mutate: vi.fn() },
  }),
}));

import { AppLayout } from '@/components/layout/AppLayout';

describe('Notification Bell', () => {
  const renderLayout = () =>
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

  it('renders the Alerts nav link', () => {
    renderLayout();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('does not show badge when unread count is 0', () => {
    mockUnreadCount.mockReturnValue(0);
    renderLayout();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows badge with unread count when > 0', () => {
    mockUnreadCount.mockReturnValue(5);
    renderLayout();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ when unread count exceeds 99', () => {
    mockUnreadCount.mockReturnValue(150);
    renderLayout();
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
