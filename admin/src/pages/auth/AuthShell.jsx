import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppLogo } from '../../components/common/AppLogo';

const HIGHLIGHTS = [
  'Live attendance across every customer site',
  'Customer-specific hourly rates with full history',
  'Invoices calculated from approved hours — never billed twice',
];

/** Split-screen frame shared by the login and password-recovery pages. */
export function AuthShell({ title, children }) {
  useEffect(() => {
    document.title = `${title} · Shiftwise Admin`;
  }, [title]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <AppLogo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Shiftwise · Demo build — data stays in this browser.</p>
      </div>
      <div
        className="relative hidden overflow-hidden bg-[#1e1b4b] lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ backgroundImage: 'url(/images/login-pattern.svg)' }}
      >
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-brand-200">Workforce administration</p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            From check-in to paid invoice, in one place.
          </h2>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-200" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Billable this month</span>
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 font-medium text-emerald-300">Approved hours only</span>
          </div>
          <p className="tabular mt-2 text-3xl font-semibold text-white">1,284.50 h</p>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <span className="w-[46%] bg-brand-500" />
            <span className="w-[22%] bg-sky-400" />
            <span className="w-[18%] bg-emerald-400" />
          </div>
          <p className="mt-3 text-2xs text-white/50">Illustration</p>
        </div>
      </div>
    </div>
  );
}
