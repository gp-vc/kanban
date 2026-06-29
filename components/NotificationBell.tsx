'use client';

import { useRef, useState, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';

export default function NotificationBell() {
  const {
    notifications, unreadCount,
    markNotificationRead, markAllNotificationsRead,
    deleteNotification, deleteAllReadNotifications,
    selectBoard, openModal,
  } = useKanban();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleNotifClick(notifId: string, boardId: string, taskId: string, read: boolean) {
    if (!read) await markNotificationRead(notifId);
    setOpen(false);
    selectBoard(boardId);
    setTimeout(() => openModal(taskId), 300);
  }

  const readCount = notifications.filter(n => n.read).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="btn"
        style={{ padding: '7px 10px', position: 'relative' }}
        title="알림"
      >
        <i className="ti ti-bell" style={{ fontSize: 14, color: open ? 'var(--purple)' : undefined }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#EF4444', color: '#fff',
            borderRadius: '50%', width: 14, height: 14,
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 500,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.14)',
          width: 320, maxHeight: 440, display: 'flex', flexDirection: 'column',
        }}>
          {/* 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px 8px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              알림{unreadCount > 0 && (
                <span style={{
                  marginLeft: 4, fontSize: 11, background: '#EF4444', color: '#fff',
                  borderRadius: 10, padding: '1px 6px', fontWeight: 700,
                }}>
                  {unreadCount}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <HeaderBtn onClick={markAllNotificationsRead} color="var(--purple-text)" hoverBg="var(--purple-light)">
                  모두 읽음
                </HeaderBtn>
              )}
              {readCount > 0 && (
                <HeaderBtn onClick={deleteAllReadNotifications} color="#D84040" hoverBg="#FCEBEB">
                  읽은 알림 삭제
                </HeaderBtn>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '24px 16px', textAlign: 'center',
                fontSize: 13, color: 'var(--text3)',
              }}>
                <i className="ti ti-bell-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.5 }} />
                새 알림이 없습니다
              </div>
            ) : (
              notifications.map(n => (
                <NotifItem
                  key={n.id}
                  n={n}
                  onClick={() => handleNotifClick(n.id, n.boardId, n.taskId, n.read)}
                  onDelete={e => { e.stopPropagation(); deleteNotification(n.id); }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 알림 아이템 ───────────────────────────────────────────────────

function NotifItem({
  n, onClick, onDelete,
}: {
  n: { id: string; type: 'mention' | 'assigned'; read: boolean; fromName: string; taskTitle: string; boardName: string; createdAt: string; commentText: string };
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px', cursor: 'pointer',
        background: hovered ? 'var(--surface2)' : n.read ? 'none' : 'var(--purple-light)',
        borderBottom: '1px solid var(--border)', transition: 'background .1s',
        position: 'relative',
      }}
    >
      {/* 타입 아이콘 */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: n.type === 'assigned' ? 'rgba(16,185,129,0.15)' : 'rgba(107,95,237,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i
          className={n.type === 'assigned' ? 'ti ti-user-check' : 'ti ti-at'}
          style={{ fontSize: 14, color: n.type === 'assigned' ? '#10B981' : 'var(--purple)' }}
        />
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: n.read ? 400 : 600, marginBottom: 2 }}>
          {n.type === 'assigned' ? (
            <>
              <span style={{ color: '#10B981' }}>{n.fromName}</span>
              {' '}님이 &quot;{n.taskTitle}&quot;에 담당자로 지정했습니다
            </>
          ) : (
            <>
              <span style={{ color: 'var(--purple-text)' }}>@{n.fromName}</span>
              {' '}님이 &quot;{n.taskTitle}&quot;에서 멘션했습니다
            </>
          )}
        </div>
        {n.type === 'mention' && (
          <div style={{
            fontSize: 11, color: 'var(--text3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {n.commentText}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
          {n.boardName} · {n.createdAt}
        </div>
      </div>

      {/* 우측: 미읽음 점 or 삭제 버튼 */}
      <div style={{ flexShrink: 0, width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
        {hovered ? (
          <button
            onClick={onDelete}
            title="알림 삭제"
            style={{
              width: 18, height: 18, borderRadius: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text3)', padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#D84040'; e.currentTarget.style.background = '#FCEBEB'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none'; }}
          >
            <i className="ti ti-x" style={{ fontSize: 12 }} />
          </button>
        ) : !n.read ? (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--purple)' }} />
        ) : null}
      </div>
    </div>
  );
}

// ── 헤더 버튼 ─────────────────────────────────────────────────────

function HeaderBtn({
  onClick, color, hoverBg, children,
}: {
  onClick: () => void;
  color: string;
  hoverBg: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, color, background: 'none',
        border: 'none', cursor: 'pointer', padding: '2px 6px',
        borderRadius: 5, fontFamily: 'inherit',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}
