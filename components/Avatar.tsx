'use client';

import { useAuth } from '../context/AuthContext';
import { useKanban } from '../context/KanbanContext';

interface Props {
  userId: string;
  size: number;
}

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  const colors = ['#7F77DD','#378ADD','#639922','#EF9F27','#E24B4A','#1D9E75','#D85A30','#D4537E','#888780'];
  return colors[h % colors.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ userId, size }: Props) {
  const { orgUsers } = useKanban();
  const { user: authUser } = useAuth();

  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%',
    flexShrink: 0, border: '2px solid var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, overflow: 'hidden',
  };

  // Firestore 프로필 우선 탐색
  const profile = orgUsers.find(u => u.uid === userId);

  if (profile) {
    if (profile.photoURL) {
      return (
        <img
          src={profile.photoURL}
          alt={profile.name}
          style={{ ...base, objectFit: 'cover' }}
          referrerPolicy="no-referrer"
        />
      );
    }
    return (
      <div style={{ ...base, background: hashColor(userId), color: '#fff', fontSize: Math.floor(size * 0.38) }}>
        {initials(profile.name || profile.email)}
      </div>
    );
  }

  // Firestore에 아직 없을 때 — 현재 로그인 유저라면 Google Auth 프로필 fallback
  if (userId === authUser?.uid) {
    if (authUser.photoURL) {
      return (
        <img
          src={authUser.photoURL}
          alt={authUser.displayName ?? ''}
          style={{ ...base, objectFit: 'cover' }}
          referrerPolicy="no-referrer"
        />
      );
    }
    const name = authUser.displayName ?? authUser.email ?? userId;
    return (
      <div style={{ ...base, background: hashColor(userId), color: '#fff', fontSize: Math.floor(size * 0.38) }}>
        {initials(name)}
      </div>
    );
  }

  // 완전 알 수 없는 UID (구 하드코딩 데이터 등)
  return (
    <div style={{ ...base, background: hashColor(userId), color: '#fff', fontSize: Math.floor(size * 0.38) }}>
      {userId.slice(0, 2).toUpperCase()}
    </div>
  );
}
