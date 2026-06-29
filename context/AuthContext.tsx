'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { upsertUserProfile } from '../lib/firestore';

const ALLOWED_DOMAIN = 'gp-vc.com';

interface AuthCtx {
  user:    User | null;
  loading: boolean;
  error:   string | null;
  signIn:  () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && !u.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        // 허용되지 않은 도메인 → 즉시 로그아웃
        await fbSignOut(auth);
        setUser(null);
        setError(`@${ALLOWED_DOMAIN} 이메일 계정만 사용 가능합니다.`);
      } else {
        setUser(u);
        if (u) {
          setError(null);
          // 로그인할 때마다 최신 프로필로 Firestore users 컬렉션 갱신
          upsertUserProfile(
            u.uid,
            u.displayName ?? u.email?.split('@')[0] ?? '',
            u.email ?? '',
            u.photoURL
          ).catch(err => console.error(
            '[Auth] 프로필 저장 실패 — Firestore Rules에 users 컬렉션 write 규칙이 있는지 확인하세요:', err
          ));
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // hd: gp-vc.com 계정을 우선 표시하도록 Google에 힌트
      provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
      const result = await signInWithPopup(auth, provider);
      if (!result.user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await fbSignOut(auth);
        setError(`@${ALLOWED_DOMAIN} 이메일 계정만 사용 가능합니다.`);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error('[Auth] signIn error:', err);
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  }

  async function signOut() {
    await fbSignOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
