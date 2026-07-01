'use client';

import { useState } from 'react';
import { useKanban } from '../context/KanbanContext';
import { useAuth } from '../context/AuthContext';
import { COL_DOTS } from '../lib/data';
import Avatar from './Avatar';

interface Props {
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { key: 'purple', label: '보라' },
  { key: 'indigo', label: '남색' },
  { key: 'violet', label: '바이올렛' },
  { key: 'blue',   label: '파랑' },
  { key: 'sky',    label: '하늘' },
  { key: 'teal',   label: '청록' },
  { key: 'green',  label: '초록' },
  { key: 'lime',   label: '라임' },
  { key: 'amber',  label: '노랑' },
  { key: 'orange', label: '주황' },
  { key: 'coral',  label: '코랄' },
  { key: 'red',    label: '빨강' },
  { key: 'rose',   label: '로즈' },
  { key: 'pink',   label: '분홍' },
  { key: 'gray',   label: '회색' },
];

export default function CreateBoardModal({ onClose }: Props) {
  const { createBoard, orgUsers } = useKanban();
  const { user } = useAuth();
  const [name,           setName]           = useState('');
  const [type,           setType]           = useState<'private' | 'shared' | 'team'>('private');
  const [color,          setColor]          = useState('purple');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // 나 자신 제외한 구성원
  const otherUsers = orgUsers.filter(u => u.uid !== user?.uid);

  function toggleMember(uid: string) {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await createBoard(name.trim(), type, color, type === 'shared' ? selectedMembers : undefined);
      onClose();
    } catch (err) {
      setError('보드 생성에 실패했습니다. 다시 시도해주세요.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const typeOptions: { val: 'private' | 'shared' | 'team'; label: string; desc: string }[] = [
    { val: 'private', label: '개인',   desc: '나만 볼 수 있음' },
    { val: 'shared',  label: '공유',   desc: '특정 멤버만' },
    { val: 'team',    label: '팀',     desc: '전체 구성원' },
  ];

  return (
    <div
      className="modal-overlay open"
      onClick={handleOverlayClick}
      style={{ zIndex: 400 }}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div className="modal-title-block">
            <div className="modal-title">새 보드 만들기</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: 16 }}>

            {/* 보드 이름 */}
            <div>
              <div className="sec-title" style={{ marginBottom: 6 }}>보드 이름 *</div>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 마케팅 프로젝트"
                style={{
                  width: '100%',
                  border: '1px solid var(--border2)',
                  borderRadius: 9,
                  padding: '9px 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--purple)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--border2)')}
              />
            </div>

            {/* 보드 유형 */}
            <div>
              <div className="sec-title" style={{ marginBottom: 6 }}>공개 범위</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {typeOptions.map(({ val, label, desc }) => (
                  <label
                    key={val}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      padding: '8px 10px',
                      border: `1px solid ${type === val ? 'var(--purple)' : 'var(--border)'}`,
                      borderRadius: 9, cursor: 'pointer', flex: 1, textAlign: 'center',
                      background: type === val ? 'var(--purple-light)' : 'var(--surface2)',
                      transition: 'all .12s',
                    }}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={val}
                      checked={type === val}
                      onChange={() => { setType(val); if (val !== 'shared') setSelectedMembers([]); }}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: type === val ? 'var(--purple-text)' : 'var(--text)' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 공유 멤버 선택 */}
            {type === 'shared' && (
              <div>
                <div className="sec-title" style={{ marginBottom: 6 }}>초대할 멤버</div>
                {otherUsers.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
                    다른 구성원이 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {otherUsers.map(u => {
                      const selected = selectedMembers.includes(u.uid);
                      return (
                        <label
                          key={u.uid}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                            background: selected ? 'var(--purple-light)' : 'var(--surface2)',
                            border: `1px solid ${selected ? 'var(--purple)' : 'transparent'}`,
                            transition: 'all .12s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMember(u.uid)}
                            style={{ accentColor: 'var(--purple)', flexShrink: 0 }}
                          />
                          <Avatar userId={u.uid} size={24} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                          </div>
                          {selected && <i className="ti ti-check" style={{ fontSize: 14, color: 'var(--purple)', flexShrink: 0 }} />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 보드 색상 */}
            <div>
              <div className="sec-title" style={{ marginBottom: 8 }}>색상</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(({ key, label }) => {
                  const dotColor = COL_DOTS[key];
                  const selected = color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setColor(key)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: dotColor,
                        border: selected ? '3px solid var(--purple)' : '2px solid transparent',
                        outline: selected ? '2px solid var(--surface)' : 'none',
                        outlineOffset: -4,
                        cursor: 'pointer',
                        transition: 'all .12s',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* 기본 컬럼 안내 */}
            <div style={{
              padding: '10px 12px',
              borderRadius: 9,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text3)',
              lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 500, color: 'var(--text2)', marginBottom: 2 }}>기본 컬럼 4개 생성</div>
              할 일 · 진행 중 · 검토 중 · 완료
            </div>

            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 0' }}>
                {error}
              </div>
            )}
          </div>

          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, justifyContent: 'flex-end',
          }}>
            <button type="button" className="btn" onClick={onClose} style={{ fontSize: 13 }}>
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || saving}
              style={{ fontSize: 13 }}
            >
              {saving
                ? <><i className="ti ti-loader-2" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />생성 중…</>
                : <><i className="ti ti-plus" style={{ fontSize: 13 }} />보드 만들기</>
              }
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
