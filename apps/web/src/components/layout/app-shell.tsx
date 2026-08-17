'use client';

import type { AuthUserDto } from '@data-room/shared';
import Link from 'next/link';

import { LogoWordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';

export function AppShell({ user, children }: { user: AuthUserDto; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/rooms"
            className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
            aria-label="All data rooms"
          >
            <LogoWordmark />
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
