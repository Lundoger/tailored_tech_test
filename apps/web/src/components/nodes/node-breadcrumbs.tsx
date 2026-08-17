'use client';

import type { BreadcrumbDto } from '@data-room/shared';
import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

const VISIBLE_TAIL = 2;

interface NodeBreadcrumbsProps {
  trail: BreadcrumbDto[] | undefined;
  hrefFor: (folderId: string | null) => string;
  isLoading?: boolean;
}

export function NodeBreadcrumbs({ trail, hrefFor, isLoading }: NodeBreadcrumbsProps) {
  if (isLoading || !trail) {
    return <Skeleton className="h-5 w-56" />;
  }

  const needsCollapse = trail.length > VISIBLE_TAIL + 2;
  const first = trail[0];
  const hidden = needsCollapse ? trail.slice(1, trail.length - VISIBLE_TAIL) : [];
  const tail = needsCollapse ? trail.slice(trail.length - VISIBLE_TAIL) : trail.slice(1);

  return (
    <Breadcrumb>
      <BreadcrumbList className="sm:gap-1.5">
        {first ? <Crumb crumb={first} hrefFor={hrefFor} isCurrent={trail.length === 1} /> : null}

        {hidden.length > 0 ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-6 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={`Show ${hidden.length} more folder${hidden.length === 1 ? '' : 's'}`}
                >
                  …
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hidden.map((crumb) => (
                    <DropdownMenuItem key={crumb.id ?? 'root'} asChild>
                      <Link href={hrefFor(crumb.id)}>{crumb.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        ) : null}

        {tail.map((crumb, index) => (
          <Crumb
            key={crumb.id ?? `crumb-${index}`}
            crumb={crumb}
            hrefFor={hrefFor}
            isCurrent={index === tail.length - 1}
            withSeparator
          />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Crumb({
  crumb,
  hrefFor,
  isCurrent,
  withSeparator,
}: {
  crumb: BreadcrumbDto;
  hrefFor: (folderId: string | null) => string;
  isCurrent: boolean;
  withSeparator?: boolean;
}) {
  return (
    <>
      {withSeparator ? <BreadcrumbSeparator /> : null}
      <BreadcrumbItem className="max-w-[16rem]">
        {isCurrent ? (
          <BreadcrumbPage className="truncate font-medium">{crumb.name}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link href={hrefFor(crumb.id)} className="truncate">
              {crumb.name}
            </Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    </>
  );
}
