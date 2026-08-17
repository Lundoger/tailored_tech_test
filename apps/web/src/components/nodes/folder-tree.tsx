'use client';

import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { ancestorIdsOf, indexFolders, type FolderTreeNode } from '@/lib/folder-tree';
import { cn } from '@/lib/utils';

interface TreeItem extends FolderTreeNode {
  children: TreeItem[];
}

interface FolderTreeProps {
  folders: FolderTreeNode[] | undefined;
  isLoading: boolean;
  roomName: string;
  currentFolderId: string | null;
  hrefFor: (folderId: string | null) => string;
  onDropNode?: (folderId: string | null) => void;
  onPrefetch?: (folderId: string | null) => void;
  isDragging?: boolean;
}

export function FolderTree({
  folders,
  isLoading,
  roomName,
  currentFolderId,
  hrefFor,
  onDropNode,
  onPrefetch,
  isDragging,
}: FolderTreeProps) {
  const roots = useMemo(() => buildTree(folders ?? []), [folders]);
  const index = useMemo(() => indexFolders(folders ?? []), [folders]);

  // Expansion is derived: the path to the open folder is expanded by definition, and
  // only deliberate clicks are stored as overrides on top of it.
  const openPath = useMemo(
    () =>
      currentFolderId
        ? new Set([...ancestorIdsOf(index, currentFolderId), currentFolderId])
        : new Set<string>(),
    [index, currentFolderId],
  );
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  const isExpanded = (id: string): boolean => overrides.get(id) ?? openPath.has(id);

  const toggle = (id: string): void => {
    const next = new Map(overrides);
    next.set(id, !isExpanded(id));
    setOverrides(next);
  };

  if (isLoading) {
    return (
      <div className="grid gap-2 px-2 py-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </div>
    );
  }

  return (
    <nav aria-label="Folder tree" className="text-sm">
      <TreeLink
        label={roomName}
        href={hrefFor(null)}
        icon={currentFolderId === null ? FolderOpen : Folder}
        depth={0}
        isActive={currentFolderId === null}
        isDropTarget={Boolean(isDragging && onDropNode)}
        onDropNode={onDropNode ? () => onDropNode(null) : undefined}
        onPrefetch={onPrefetch ? () => onPrefetch(null) : undefined}
      />

      <ul role="tree" className="mt-0.5">
        {roots.map((folder) => (
          <TreeBranch
            key={folder.id}
            folder={folder}
            currentFolderId={currentFolderId}
            isExpanded={isExpanded}
            onToggle={toggle}
            hrefFor={hrefFor}
            onDropNode={onDropNode}
            onPrefetch={onPrefetch}
            isDragging={isDragging}
          />
        ))}
      </ul>
    </nav>
  );
}

function TreeBranch({
  folder,
  currentFolderId,
  isExpanded,
  onToggle,
  hrefFor,
  onDropNode,
  onPrefetch,
  isDragging,
}: {
  folder: TreeItem;
  currentFolderId: string | null;
  isExpanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  hrefFor: (folderId: string | null) => string;
  onDropNode?: (folderId: string | null) => void;
  onPrefetch?: (folderId: string | null) => void;
  isDragging?: boolean;
}) {
  const isOpen = isExpanded(folder.id);
  const isActive = currentFolderId === folder.id;
  const hasChildren = folder.children.length > 0;

  return (
    <li role="treeitem" aria-selected={isActive} aria-expanded={hasChildren ? isOpen : undefined}>
      <TreeLink
        label={folder.name}
        href={hrefFor(folder.id)}
        icon={isActive ? FolderOpen : Folder}
        depth={folder.depth + 1}
        isActive={isActive}
        isDropTarget={Boolean(isDragging && onDropNode)}
        onDropNode={onDropNode ? () => onDropNode(folder.id) : undefined}
        onPrefetch={onPrefetch ? () => onPrefetch(folder.id) : undefined}
        toggle={hasChildren ? { isOpen, onToggle: () => onToggle(folder.id) } : undefined}
      />

      {hasChildren && isOpen ? (
        <ul role="group">
          {folder.children.map((child) => (
            <TreeBranch
              key={child.id}
              folder={child}
              currentFolderId={currentFolderId}
              isExpanded={isExpanded}
              onToggle={onToggle}
              hrefFor={hrefFor}
              onDropNode={onDropNode}
              onPrefetch={onPrefetch}
              isDragging={isDragging}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TreeLink({
  label,
  href,
  icon: Icon,
  depth,
  isActive,
  toggle,
  isDropTarget,
  onDropNode,
  onPrefetch,
}: {
  label: string;
  href: string;
  icon: typeof Folder;
  depth: number;
  isActive: boolean;
  toggle?: { isOpen: boolean; onToggle: () => void };
  isDropTarget?: boolean;
  onDropNode?: () => void;
  onPrefetch?: () => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center rounded-md',
        isActive && 'bg-accent',
        isOver && 'ring-ring ring-offset-background ring-2 ring-offset-1',
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
      onDragOver={
        isDropTarget
          ? (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setIsOver(true);
            }
          : undefined
      }
      onDragLeave={isDropTarget ? () => setIsOver(false) : undefined}
      onDrop={
        isDropTarget
          ? (event) => {
              event.preventDefault();
              setIsOver(false);
              onDropNode?.();
            }
          : undefined
      }
    >
      {toggle ? (
        <button
          type="button"
          onClick={toggle.onToggle}
          aria-label={`${toggle.isOpen ? 'Collapse' : 'Expand'} ${label}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-5 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronRight
            className={cn('size-3.5 transition-transform', toggle.isOpen && 'rotate-90')}
            aria-hidden
          />
        </button>
      ) : (
        <span className="size-5 shrink-0" aria-hidden />
      )}

      <Link
        href={href}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        className={cn(
          'focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none',
          isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
    </div>
  );
}

function buildTree(folders: FolderTreeNode[]): TreeItem[] {
  const byId = new Map<string, TreeItem>();
  for (const folder of folders) {
    byId.set(folder.id, { ...folder, children: [] });
  }

  const roots: TreeItem[] = [];
  for (const folder of byId.values()) {
    const parent = folder.parentId ? byId.get(folder.parentId) : undefined;
    if (parent) parent.children.push(folder);
    else roots.push(folder);
  }

  return roots;
}
