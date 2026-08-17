'use client';

import { formatBytes, type SearchResultDto } from '@data-room/shared';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { NodeIcon } from '@/components/nodes/node-icon';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useSearchNodes } from '@/hooks/use-nodes';

interface SearchCommandProps {
  dataRoomId: string;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (node: SearchResultDto) => void;
}

export function SearchCommand({ dataRoomId, onOpenFolder, onOpenFile }: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const { data: results, isFetching } = useSearchNodes(dataRoomId, debounced);

  const choose = (result: SearchResultDto) => {
    setOpen(false);
    setTerm('');
    if (result.type === 'FOLDER') {
      onOpenFolder(result.id);
    } else {
      onOpenFile(result);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground h-9 w-full justify-start gap-2 px-3 sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
        <span className="truncate">Search files…</span>
        <kbd className="bg-muted ml-auto hidden shrink-0 rounded border px-1.5 font-mono text-[0.6875rem] sm:inline">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search this data room"
        description="Find a folder or document by name"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name…"
            value={term}
            onValueChange={setTerm}
            autoFocus
          />
          <CommandList>
            {debounced.length === 0 ? (
              <CommandEmpty>Type to search across every folder.</CommandEmpty>
            ) : isFetching && !results ? (
              <CommandEmpty>Searching…</CommandEmpty>
            ) : !results || results.length === 0 ? (
              <CommandEmpty>Nothing matches “{debounced}”.</CommandEmpty>
            ) : (
              <CommandGroup heading={`${results.length} result${results.length === 1 ? '' : 's'}`}>
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => choose(result)}
                    className="gap-2.5"
                  >
                    <NodeIcon node={result} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{result.name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {result.path.length > 0
                          ? result.path.map((crumb) => crumb.name).join(' / ')
                          : 'Top level'}
                      </span>
                    </span>
                    {result.file ? (
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {formatBytes(result.file.sizeBytes)}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
