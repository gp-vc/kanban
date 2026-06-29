'use client';

import { useState } from 'react';
import { useKanban } from '../context/KanbanContext';
import Avatar from './Avatar';
import type { FirestoreBoard } from '../lib/types';

interface Props {
  board: FirestoreBoard;
  onClose: () => void;
}

export default function BoardMembersModal({ board, onClose }: Props) {
  const { orgUsers, updateBoardMembers } = useKanban();
  const [saving, setSaving] = useState(false);

  // 오너 제외 현재 멤버 UID 목록
  const [memberDraft, setMemberDraft] = useState<string[]>(
    board.memberIds.filter(id => id !== '__team__' && id !== board.ownerId)
  );

  const otherUsers = orgUsers.filter(u => u.uid !== board.ownerId);

  function toggleMember(uid: string) {
    setMemberDraft(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  }

  async function handleSave() {
    setSaving(true);
    const newMemberIds = [...new Set([board.ownerId, ...memberDraft])];
    const newType: 'private' | 'shared' | 'team' =
      memberDraft.length > 0 ? 'shared' : 'private';
    try {
      await updateBoardMembers(board.id, newMemberIds, newType);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick} style={{ zIndex: 500 }}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <div className="modal-title-block">
            <div className="modal-title">멤버 관리</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{board.name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 14 }}>
          {/* 소유자 */}
          <div>
            <div className="sec-title" style={{ marginBottom: 8 }}>소유자</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)' }}>
              <Avatar userId={board.ownerId} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {orgUsers.find(u => u.uid === board.ownerId)?.name ?? '소유자'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {orgUsers.find(u => u.uid === board.ownerId)?.email ?? ''}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--purple)', background: 'var(--purple-light)', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>
                소유자
              </span>
            </div>
          </div>

          {/* 초대할 멤버 */}
          <div>
            <div className="sec-title" style={{ marginBottom: 8 }}>
              구성원 {memberDraft.length > 0 && <span style={{ color: 'var(--purple)' }}>({memberDraft.length}명 선택)</span>}
            </div>
            {otherUsers.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>다른 구성원이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {otherUsers.map(u => {
                  const selected = memberDraft.includes(u.uid);
                  return (
                    <label
                      key={u.uid}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
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
                      <Avatar userId={u.uid} size={28} />
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
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ fontSize: 13 }}>취소</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ fontSize: 13 }}
          >
            {saving
              ? <><i className="ti ti-loader-2" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />저장 중…</>
              : <><i className="ti ti-check" style={{ fontSize: 13 }} />저장</>
            }
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
