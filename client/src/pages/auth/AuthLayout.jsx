import { CalendarCheck2, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { AppLogo } from '../../components/common/AppLogo';

const FEATURES = [
  { icon: Clock, title: 'Accurate working hours', text: 'Check in and out per customer and project with a live shift timer.' },
  { icon: MapPin, title: 'Built for field work', text: 'Your assigned sites, contacts and instructions in one place.' },
  { icon: CalendarCheck2, title: 'Your attendance history', text: 'Daily, weekly and monthly totals calculated from your shifts.' },
];

/** Split-screen frame for the login and password-reset pages. */
export function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside
        className="relative hidden overflow-hidden bg-[#0B1023] p-12 text-white lg:flex lg:flex-col"
        style={{ backgroundImage: 'url(/images/grid-pattern.svg)' }}
      >
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/30 blur-3xl"
          aria-hidden="true"
        />
        <AppLogo inverted showTagline />
        <div className="relative mt-auto max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Your workday, recorded right.</h2>
          <p className="mt-3 text-[15px] text-white/70">
            The employee portal for logging shifts at customer locations and keeping track of your assignments.
          </p>
          <ul className="mt-10 space-y-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={14} aria-hidden="true" />
          Employee access only. Administration is handled in a separate system.
        </p>
      </aside>

      <main className="safe-top safe-bottom flex flex-col px-4 py-8 sm:px-8 lg:px-16">
        <div className="lg:hidden">
          <AppLogo showTagline />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}

export default AuthLayout;
