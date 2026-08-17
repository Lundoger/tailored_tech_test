export function uploadWithProgress(options: {
  url: string;
  method: 'PUT';
  body: Blob;
  headers?: Record<string, string>;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(options.method, options.url, true);

    for (const [header, value] of Object.entries(options.headers ?? {})) {
      request.setRequestHeader(header, value);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(event.loaded / event.total);
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        options.onProgress?.(1);
        resolve();
        return;
      }
      reject(new UploadTransferError(`Storage rejected the upload (HTTP ${request.status}).`));
    };

    request.onerror = () =>
      reject(new UploadTransferError('The connection dropped while uploading.'));
    request.ontimeout = () => reject(new UploadTransferError('The upload timed out.'));
    request.onabort = () => reject(new UploadAbortedError());

    if (options.signal) {
      if (options.signal.aborted) {
        request.abort();
        reject(new UploadAbortedError());
        return;
      }
      options.signal.addEventListener('abort', () => request.abort(), { once: true });
    }

    request.send(options.body);
  });
}

export class UploadTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadTransferError';
  }
}

export class UploadAbortedError extends Error {
  constructor() {
    super('Upload cancelled.');
    this.name = 'UploadAbortedError';
  }
}
