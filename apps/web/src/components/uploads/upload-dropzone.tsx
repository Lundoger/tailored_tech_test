'use client';

import { CloudUpload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  targetName: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function UploadDropzone({ onFiles, targetName, disabled, children }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);

  const reset = useCallback(() => {
    depth.current = 0;
    setIsDragging(false);
  }, []);

  const carriesFiles = (event: React.DragEvent): boolean =>
    Array.from(event.dataTransfer.types).includes('Files');

  return (
    <div
      className="relative flex flex-1 flex-col"
      onDragEnter={(event) => {
        if (disabled || !carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        if (disabled || !carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (disabled || !carriesFiles(event)) return;
        depth.current -= 1;
        if (depth.current <= 0) reset();
      }}
      onDrop={(event) => {
        if (disabled || !carriesFiles(event)) return;
        event.preventDefault();
        reset();
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      }}
    >
      {children}

      {isDragging ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-30 flex items-center justify-center',
            'border-foreground/40 bg-background/85 rounded-xl border-2 border-dashed backdrop-blur-[2px]',
          )}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <CloudUpload className="text-foreground/70 size-7" />
            <p className="font-medium">Drop to upload</p>
            <p className="text-muted-foreground text-sm">
              Files will be added to{' '}
              <span className="text-foreground font-medium">{targetName}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
