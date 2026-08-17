import type { ApiErrorBody } from '@data-room/shared';

import { ApiError, NetworkError } from './api-error';

const API_BASE = '/api';

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<TResponse> {
  const url = `${API_BASE}${path}${buildQueryString(options.query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new NetworkError(cause);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(toErrorBody(payload, response.status));
  }

  return payload as TResponse;
}

export const api = {
  get: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>('GET', path, undefined, options),
  post: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>('POST', path, body, options),
  patch: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>('PATCH', path, body, options),
  delete: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>('DELETE', path, undefined, options),
};

function buildQueryString(query: RequestOptions['query']): string {
  if (!query) return '';

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toErrorBody(payload: unknown, status: number): ApiErrorBody {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    'message' in payload &&
    typeof (payload as { message: unknown }).message === 'string'
  ) {
    return payload as ApiErrorBody;
  }

  return {
    statusCode: status,
    code: status === 401 ? 'UNAUTHENTICATED' : status === 404 ? 'NOT_FOUND' : 'VALIDATION_FAILED',
    message:
      status >= 500
        ? 'The server had a problem handling that. Please try again.'
        : 'That request could not be completed.',
  };
}
