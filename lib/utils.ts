import { ACOLORS, USERS } from './data';

export function getAvatarColors(userId: string): [string, string] {
  const idx = USERS.findIndex(u => u.id === userId);
  return (ACOLORS[idx % ACOLORS.length] ?? ['#eee', '#555']) as [string, string];
}

export interface DueInfo {
  str: string;
  cls: 'overdue' | 'soon' | '';
}

export function fmtDate(d?: string): DueInfo | null {
  if (!d) return null;
  const dt = new Date(d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (dt.getTime() - now.getTime()) / 86400000;
  const m = dt.getMonth() + 1;
  const day = dt.getDate();
  const cls: 'overdue' | 'soon' | '' = diff < 0 ? 'overdue' : diff <= 3 ? 'soon' : '';
  return { str: `${m}/${day}`, cls };
}
