import { Download, Share, Plus, Smartphone } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

/**
 * "Install app" affordance for the Settings page. Renders only when install is
 * actually relevant: an Android/Chromium native prompt is available, or the
 * user is on iOS Safari (which needs the manual Share → Add to Home Screen
 * gesture). Already-installed (standalone) instances render nothing.
 */
export function InstallAppCard() {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();

  if (isStandalone) return null;
  if (!canInstall && !isIOS) return null; // desktop / unsupported — no CTA

  return (
    <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2 text-eyebrow text-text-tertiary">
        <Smartphone className="h-4 w-4" />
        Install Acharya Jyotish
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        Add the app to your home screen for a full-screen, app-like experience —
        and open your saved charts even when you're offline.
      </p>

      {canInstall ? (
        <button
          onClick={promptInstall}
          className="mt-4 inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover"
        >
          <Download className="h-4 w-4" />
          Install app
        </button>
      ) : (
        // iOS Safari: no install event — show the manual gesture.
        <ol className="mt-4 space-y-2 text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <Share className="h-4 w-4 shrink-0 text-brand-saffron" />
            Tap the <span className="font-medium text-text-primary">Share</span> button in Safari.
          </li>
          <li className="flex items-center gap-2">
            <Plus className="h-4 w-4 shrink-0 text-brand-saffron" />
            Choose <span className="font-medium text-text-primary">Add to Home Screen</span>.
          </li>
        </ol>
      )}
    </div>
  );
}
