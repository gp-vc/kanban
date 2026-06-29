'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, error } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signIn();
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,.08)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: 360,
        textAlign: 'center',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <img src="/gpvc-logo.svg" alt="GPVC" style={{ height: 36, display: 'block' }} />
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          로그인
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28, lineHeight: 1.6 }}>
          GPVC 구성원 전용 서비스입니다.
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            fontSize: 12, color: '#D84040',
            background: '#FCEBEB',
            border: '1px solid #F8C8C8',
            borderRadius: 8,
            padding: '9px 12px',
            marginBottom: 16,
            textAlign: 'left',
            lineHeight: 1.5,
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 13, marginRight: 5 }} />
            {error}
          </div>
        )}

        {/* Google 로그인 버튼 */}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '11px 20px',
            background: signingIn ? 'var(--surface2)' : 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 10,
            cursor: signingIn ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: signingIn ? 'var(--text3)' : 'var(--text)',
            fontFamily: 'inherit',
            transition: 'border-color .15s',
          }}
          onMouseEnter={e => { if (!signingIn) e.currentTarget.style.borderColor = 'var(--purple)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; }}
        >
          {signingIn ? (
            <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} />
          ) : (
            /* Google 색상 G 아이콘 */
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.34-8.16 2.34-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
          )}
          {signingIn ? '로그인 중...' : 'Google 계정으로 로그인'}
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text3)' }}>
          @gp-vc.com 계정만 로그인할 수 있습니다.
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
