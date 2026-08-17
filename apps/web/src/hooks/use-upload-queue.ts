'use client';

import {
  ACCEPTED_FILE_EXTENSIONS,
  type ConflictStrategy,
  formatBytes,
  type InitUploadResultDto,
  MAX_UPLOAD_BYTES,
  type NodeDto,
} from '@data-room/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { api } from '@/lib/api-client';
import { ApiError, errorMessage } from '@/lib/api-error';
import { invalidateNodeChange } from '@/lib/node-cache';
import { UploadAbortedError, uploadWithProgress } from '@/lib/xhr-upload';

const MAX_CONCURRENT_UPLOADS = 3;

export type UploadStatus =
  'queued' | 'uploading' | 'finalising' | 'done' | 'error' | 'conflict' | 'cancelled';

export interface UploadItem {
  id: string;
  fileName: string;
  sizeBytes: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  suggestedName?: string;
  finalName?: string;
}

interface QueueEntry {
  file: File;
  strategy: ConflictStrategy;
  controller: AbortController;
  versionId?: string;
}

export function useUploadQueue({
  dataRoomId,
  parentId,
}: {
  dataRoomId: string;
  parentId: string | null;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const entries = useRef(new Map<string, QueueEntry>());
  const waiting = useRef<string[]>([]);
  const activeCount = useRef(0);
  const queryClient = useQueryClient();

  function update(id: string, patch: Partial<UploadItem>): void {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function enqueue(id: string): void {
    waiting.current.push(id);
    update(id, { status: 'queued', error: undefined, progress: 0 });
    pump();
  }

  // Declarations rather than const arrows: `run` ends by calling `pump`, and `pump`
  // starts `run`. Hoisting lets them refer to each other directly.
  function pump(): void {
    while (activeCount.current < MAX_CONCURRENT_UPLOADS && waiting.current.length > 0) {
      const id = waiting.current.shift();
      if (id) void run(id);
    }
  }

  async function run(id: string): Promise<void> {
    const entry = entries.current.get(id);
    if (!entry) return;

    activeCount.current += 1;
    update(id, { status: 'uploading', progress: 0, error: undefined });

    try {
      const reservation = await api.post<InitUploadResultDto>(
        `/data-rooms/${dataRoomId}/files/init`,
        {
          name: entry.file.name,
          parentId,
          mimeType: entry.file.type,
          sizeBytes: entry.file.size,
          conflictStrategy: entry.strategy,
        },
        { signal: entry.controller.signal },
      );

      entry.versionId = reservation.versionId;

      await uploadWithProgress({
        url: reservation.uploadUrl,
        method: 'PUT',
        body: entry.file,
        headers: { 'Content-Type': 'application/pdf' },
        onProgress: (fraction) => update(id, { progress: fraction }),
        signal: entry.controller.signal,
      });

      update(id, { status: 'finalising', progress: 1 });

      const node = await api.post<NodeDto>(`/files/versions/${reservation.versionId}/complete`);

      update(id, { status: 'done', finalName: node.name, progress: 1 });
      // A new version reuses the node, so its history and signed URL go stale too.
      invalidateNodeChange(queryClient, {
        dataRoomId,
        parentIds: [node.parentId],
        nodeIds: [node.id],
      });
    } catch (error) {
      if (error instanceof UploadAbortedError || entry.controller.signal.aborted) {
        update(id, { status: 'cancelled' });
        await releaseReservation(entry.versionId);
      } else if (error instanceof ApiError && error.is('NAME_CONFLICT')) {
        update(id, {
          status: 'conflict',
          suggestedName: error.suggestedName ?? undefined,
          error: error.message,
        });
      } else {
        update(id, { status: 'error', error: errorMessage(error) });
        await releaseReservation(entry.versionId);
      }
    } finally {
      activeCount.current -= 1;
      pump();
    }
  }

  function addFiles(files: File[]): void {
    const added: UploadItem[] = [];

    for (const file of files) {
      const id = crypto.randomUUID();
      const problem = rejectionReason(file);

      if (problem) {
        added.push({
          id,
          fileName: file.name,
          sizeBytes: file.size,
          status: 'error',
          progress: 0,
          error: problem,
        });
        continue;
      }

      entries.current.set(id, { file, strategy: 'FAIL', controller: new AbortController() });
      waiting.current.push(id);

      added.push({
        id,
        fileName: file.name,
        sizeBytes: file.size,
        status: 'queued',
        progress: 0,
      });
    }

    setItems((previous) => [...previous, ...added]);
    pump();
  }

  function resolveConflict(id: string, choice: ConflictStrategy | 'SKIP'): void {
    const entry = entries.current.get(id);
    if (!entry) return;

    if (choice === 'SKIP') {
      entries.current.delete(id);
      update(id, { status: 'cancelled' });
      return;
    }

    entry.strategy = choice;
    entry.controller = new AbortController();
    enqueue(id);
  }

  function retry(id: string): void {
    const entry = entries.current.get(id);
    if (!entry) return;

    entry.controller = new AbortController();
    enqueue(id);
  }

  function cancel(id: string): void {
    const entry = entries.current.get(id);
    if (!entry) return;

    waiting.current = waiting.current.filter((waitingId) => waitingId !== id);
    entry.controller.abort();
    update(id, { status: 'cancelled' });
  }

  function cancelAll(): void {
    waiting.current = [];
    for (const [id, entry] of entries.current) {
      if (!entry.controller.signal.aborted) {
        entry.controller.abort();
        update(id, { status: 'cancelled' });
      }
    }
  }

  function clearFinished(): void {
    setItems((previous) =>
      previous.filter((item) => !['done', 'cancelled', 'error'].includes(item.status)),
    );
  }

  return {
    items,
    conflicts: items.filter((item) => item.status === 'conflict'),
    isUploading: items.some((item) => ['queued', 'uploading', 'finalising'].includes(item.status)),
    addFiles,
    resolveConflict,
    retry,
    cancel,
    cancelAll,
    clearFinished,
  };
}

async function releaseReservation(versionId: string | undefined): Promise<void> {
  if (!versionId) return;

  try {
    await api.delete<void>(`/files/versions/${versionId}`);
  } catch {
    // Best effort. The user has already been told the upload failed; a second
    // error about cleaning up after it would only add noise.
  }
}

function rejectionReason(file: File): string | null {
  const hasAcceptedExtension = ACCEPTED_FILE_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );

  if (!hasAcceptedExtension) {
    return 'Only PDF files can be uploaded.';
  }
  if (file.size === 0) {
    return 'This file is empty.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit.`;
  }

  return null;
}
