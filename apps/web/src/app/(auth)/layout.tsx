import { FolderTree, ShieldCheck, Users } from 'lucide-react';

import { LogoWordmark } from '@/components/brand/logo';

const HIGHLIGHTS = [
  {
    icon: FolderTree,
    title: 'Structure that holds up',
    description:
      'Nest folders as deeply as the deal needs, and move things without breaking links.',
  },
  {
    icon: Users,
    title: 'Share exactly what you mean to',
    description: 'A public link for the broad set, named invitations for the sensitive folders.',
  },
  {
    icon: ShieldCheck,
    title: 'Revoke in one click',
    description: 'Access ends the moment you say so, and every view is on the record.',
  },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="bg-foreground text-background relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div
          aria-hidden
          className="bg-background/[0.07] pointer-events-none absolute -top-32 -right-24 size-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="bg-background/[0.05] pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full blur-3xl"
        />

        <LogoWordmark className="text-background relative" />

        <div className="relative max-w-md">
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
            Due diligence, without the mess of email attachments.
          </h1>
          <p className="text-background/70 mt-4">
            Put every document in one organised place, decide precisely who sees what, and keep a
            record of who looked.
          </p>

          <ul className="mt-10 grid gap-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3.5">
                <span className="bg-background/10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-background/60 mt-0.5 text-sm">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-background/40 relative text-xs">
          Built as a take-home project. Documents are stored privately per account.
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <LogoWordmark />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
