import { useEffect, useState } from 'react';
export const QUERY_ROLES = ['MD', 'RM', 'CP', 'CP_HEAD', 'MIS'];
export type Person = { _id: string; firstName?: string; middleName?: string; lastName?: string; employeeCode?: string };
export type QueryRecipient = Person & { roleCode: 'CP_HEAD' | 'MIS' };
export type QueryThread = { _id: string; title: string; createdBy: Person; assignedTo: Person; recipientRole: string; lastMessageAt: string };
export type QueryMessage = { _id: string; sender: Person; body: string; createdAt: string };
export type PageMeta = { page: number; limit: number; total: number; totalPages: number };
export type QueryDetail = { thread: QueryThread; messages: QueryMessage[]; meta: PageMeta };
export type QueryNotification = { _id: string; thread: string; title: string; readAt: string | null; createdAt: string };
export type NotificationInbox = { items: QueryNotification[]; unreadCount: number; meta: PageMeta };
export type QueryApi = { get: <T>(path: string) => Promise<{ data: T }>; post: <T>(path: string, data?: unknown) => Promise<{ data: T }> };
export function personName(person: Person | null | undefined) {
  return person ? [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') || person.employeeCode || 'Team member' : 'Team member';
}
const listeners = new Set<() => void>();
export function notificationsChanged() { listeners.forEach(listener => listener()); }
export function useNotifications(api: QueryApi, accountKey: string, active = true) {
  const [page, setPage] = useState(1), [tick, setTick] = useState(0);
  const [inbox, setInbox] = useState<NotificationInbox | null>(null), [error, setError] = useState('');
  const refresh = () => setTick(value => value + 1);
  useEffect(() => { setInbox(null); setPage(1); setError(''); }, [accountKey]);
  useEffect(() => { const changed = () => setTick(value => value + 1); listeners.add(changed); return () => { listeners.delete(changed); }; }, []);
  useEffect(() => {
    if (!accountKey || !active) return;
    let current = true;
    void api.get<NotificationInbox>(`/notifications?page=${page}&limit=20`).then(result => { if (current) { setInbox(result.data); setError(''); } }).catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'Unable to load notifications.'); });
    return () => { current = false; };
  }, [api, accountKey, page, tick, active]);
  return { inbox, error, page, setPage, refresh };
}
