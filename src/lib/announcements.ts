import { useEffect, useState } from 'react';
export const ANNOUNCEMENT_PUBLISHERS = ['MD', 'MIS', 'CP_HEAD', 'RM'];
export const ANNOUNCEMENT_CATEGORIES = ['BUSINESS', 'TARGET', 'MOTIVATION'];
export const ANNOUNCEMENT_INTERVAL_MS = 12000;
export type Announcement = { _id: string; title: string; body: string; category: string; audienceRoles: string[]; scope: string; authorRole: string; createdBy: { _id: string; firstName?: string; lastName?: string; employeeCode?: string }; isActive: boolean; expiresAt: string | null; createdAt: string };
export type AnnouncementPage = { items: Announcement[]; meta: { total: number; totalPages: number; page: number } };
export type AnnouncementAudience = { roles: { code: string; name: string }[]; scope: string };
type FeedApi = { get: <T>(path: string) => Promise<{ data: T }> };
const listeners = new Set<() => void>();
export function announcementsChanged() { listeners.forEach(listener => listener()); }
export function announcementAuthor(item: Announcement) { return [item.createdBy?.firstName, item.createdBy?.lastName].filter(Boolean).join(' ') || item.createdBy?.employeeCode || 'Sunvika'; }
export function localAnnouncementDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
export function useAnnouncementFeed(api: FeedApi, accountKey: string) {
  const [items, setItems] = useState<Announcement[]>([]), [error, setError] = useState(''), [tick, setTick] = useState(0), [now, setNow] = useState(Date.now());
  const refresh = () => setTick(value => value + 1);
  useEffect(() => { setItems([]); setError(''); }, [accountKey]);
  useEffect(() => { const listener = () => setTick(value => value + 1); listeners.add(listener); return () => { listeners.delete(listener); }; }, []);
  useEffect(() => {
    if (!accountKey) return; let active = true;
    void (async () => {
      try {
        const collected: Announcement[] = []; let page = 1, totalPages = 1;
        do { const result = await api.get<AnnouncementPage>(`/announcements/feed?page=${page}&limit=100`); if (!active) return; collected.push(...result.data.items); totalPages = result.data.meta.totalPages; page++; } while (page <= totalPages);
        if (active) { setItems([...new Map(collected.map(item => [item._id, item])).values()]); setError(''); setNow(Date.now()); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load announcements.'); }
    })();
    return () => { active = false; };
  }, [api, accountKey, tick]);
  useEffect(() => {
    const nextExpiry = Math.min(...items.filter(item => item.expiresAt && Date.parse(item.expiresAt) > now).map(item => Date.parse(item.expiresAt!)));
    if (!Number.isFinite(nextExpiry)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(1, nextExpiry - Date.now()), 2147483647));
    return () => clearTimeout(timer);
  }, [items, now]);
  return { items: items.filter(item => item.isActive && (!item.expiresAt || Date.parse(item.expiresAt) > now)), error, refresh };
}
export function useAnnouncementCarousel(length: number, active = true) {
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
  useEffect(() => { setIndex(0); }, [length]);
  const current = length ? index % length : 0;
  useEffect(() => {
    if (length < 2 || paused || !active) return;
    const timer = setTimeout(() => setIndex(value => (value + 1) % length), ANNOUNCEMENT_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [length, current, paused, active]);
  const move = (delta: number) => { if (length) setIndex(value => (value + delta + length) % length); };
  return { index: current, paused, setPaused, previous: () => move(-1), next: () => move(1) };
}

export function announcementRoleAvailable(role: { code: string; name?: string }): boolean {
  const normalize = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return !['ADMIN_HEAD', 'MH', 'MARKETING_HEAD'].some(code => normalize(role.code) === code || normalize(role.name ?? '') === code);
}
export function announcementAudienceCodes(codes: string[]) { return codes.filter(code => announcementRoleAvailable({ code })); }

export function announcementAudienceChanged(previous: string[], selected: string[]): boolean {
  return previous.length !== selected.length || previous.some(code => !selected.includes(code));
}
