'use client';

import { useRef, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import type { Priority } from '../lib/types';

const PRIORITY_OPTS: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'urgent', label: '긴급', color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
  { value: 'high',   label: '높음', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  { value: 'medium', label: '보통', color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' },
  { value: 'low',    label: '낮음', color: '#94A3B8', bg: 'rgba(100,116,139,0.15)'},
];

interface Props {
  onClose: () => void;
}

export default function FilterPanel({ onClose }: Props) {
  const { currentBoard, orgUsers, cardFilter, setCardFilter, activeFilterCount, clearFilter } = useKanban();
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function toggleAssignee(uid: string) {
    setCardFilter({
      ...cardFilter,
      assignees: cardFilter.assignees.includes(uid)
        ? cardFilter.assignees.filter(id => id !== uid)
        : [...cardFilter.assignees, uid],
    });
  }

  function togglePriority(p: Priority) {
    setCardFilter({
      ...cardFilter,
      priorities: cardFilter.priorities.includes(p)
        ? cardFilter.priorities.filter(x => x !== p)
        : [...cardFilter.priorities, p],
    });
  }

  function toggleLabel(id: string) {
    setCardFilter({
      ...cardFilter,
      labelIds: cardFilter.labelIds.includes(id)
        ? cardFilter.labelIds.filter(x => x !== id)
        : [...cardFilter.labelIds, id],
    });
  }

  const labels = currentBoard?.labels ?? [];
  const members = currentBoard
    ? orgUsers.filter(u => currentBoard.memberIds.includes(u.uid) || currentBoard.type === 'team')
    : orgUsers;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 500,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.14)',
        width: 260, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          필터
          {activeFilterCount > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 10, background: 'var(--purple)', color: '#fff',
              borderRadius: 10, padding: '1px 6px', fontWeight: 700,
            }}>
              {activeFilterCount}
            </span>
          )}
        </span>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilter}
            style={{
              fontSize: 11, color: 'var(--text3)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '2px 6px',
              borderRadius: 5, fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D84040')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            초기화
          </button>
        )}
      </div>

      {/* 담당자 */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
          담당자
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 나만 보기 빠른 버튼 */}
          {user && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px',
              borderRadius: 7, cursor: 'pointer',
              background: cardFilter.assignees.length === 1 && cardFilter.assignees[0] === user.uid
                ? 'var(--purple-light)' : 'transparent',
              transition: 'background .1s',
            }}>
              <input
                type="checkbox"
                checked={cardFilter.assignees.length === 1 && cardFilter.assignees[0] === user.uid}
                onChange={() => {
                  if (cardFilter.assignees.length === 1 && cardFilter.assignees[0] === user.uid) {
                    setCardFilter({ ...cardFilter, assignees: [] });
                  } else {
                    setCardFilter({ ...cardFilter, assignees: [user.uid] });
                  }
                }}
                style={{ accentColor: 'var(--purple)', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>나만 보기</span>
            </label>
          )}
          {members.map(u => (
            <label
              key={u.uid}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px',
                borderRadius: 7, cursor: 'pointer',
                background: cardFilter.assignees.includes(u.uid) ? 'var(--purple-light)' : 'transparent',
                transition: 'background .1s',
              }}
            >
              <input
                type="checkbox"
                checked={cardFilter.assignees.includes(u.uid)}
                onChange={() => toggleAssignee(u.uid)}
                style={{ accentColor: 'var(--purple)', flexShrink: 0 }}
              />
              <Avatar userId={u.uid} size={20} />
              <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 우선순위 */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
          우선순위
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PRIORITY_OPTS.map(opt => {
            const active = cardFilter.priorities.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => togglePriority(opt.value)}
                style={{
                  padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                  background: active ? opt.bg : 'var(--surface2)',
                  color: active ? opt.color : 'var(--text3)',
                  border: active ? `2px solid ${opt.color}` : '2px solid transparent',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 라벨 */}
      {labels.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            라벨
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {labels.map(lm => {
              const active = cardFilter.labelIds.includes(lm.id);
              return (
                <button
                  key={lm.id}
                  onClick={() => toggleLabel(lm.id)}
                  style={{
                    padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                    background: lm.bg, color: lm.c,
                    border: active ? `2px solid ${lm.c}` : '2px solid transparent',
                    opacity: active ? 1 : 0.55,
                  }}
                >
                  {lm.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
