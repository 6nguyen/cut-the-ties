import type { RouteResponse } from '@worker/route';
export type { RouteResponse, GoalCard, TargetCard } from '@worker/route';

export interface ApiError { error: string; message: string; status: number }

/** social-sharing §5: the `via` tag a share link carries (`?via=share`); only a short slug is passed on, anything else is dropped. */
const VIA = /^[a-z0-9-]{1,16}$/;
export function validVia(search: string | undefined = typeof location === 'undefined' ? '' : location.search): string | undefined {
  const v = new URLSearchParams(search ?? '').get('via');
  return v && VIA.test(v) ? v : undefined;
}
/** The query that carries a valid `via` on to another page, or ''. */
export function viaQuery(search?: string): string {
  const v = validVia(search);
  return v ? `?via=${v}` : '';
}

export async function route(body: { address?: string; state?: string; district?: number; by_location?: boolean; by_suggestion?: boolean; turnstile?: string; via?: string }): Promise<RouteResponse> {
  const res = await fetch('/api/route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({ error: 'bad_response', message: 'The server sent something we could not read.' }))) as Partial<ApiError>;
  if (!res.ok) throw Object.assign(new Error(data.message ?? 'Request failed'), { error: data.error ?? 'unknown', status: res.status }) as ApiError & Error;
  return data as unknown as RouteResponse;
}

export function districtLabel(state: string, district: number): string {
  return district === 0 ? `${state} at large` : `${state}-${String(district).padStart(2, '0')}`;
}
