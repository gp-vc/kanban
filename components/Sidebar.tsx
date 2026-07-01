'use client';

import { useRef, useState, useEffect } from 'react';
import { COL_DOTS } from '../lib/data';
import { useKanban } from '../context/KanbanContext';
import { useAuth } from '../context/AuthContext';
import CreateBoardModal from './CreateBoardModal';
import Avatar from './Avatar';
import type { FirestoreBoard } from '../lib/types';

const BG_PRESETS = [
  { id: 'default',  label: '기본',    value: '' },
  { id: 'sky',      label: '하늘',    value: 'linear-gradient(160deg, #dfe9f3 0%, #b8cfd8 100%)' },
  { id: 'lavender', label: '라벤더',  value: 'linear-gradient(160deg, #e8e0f0 0%, #c8b5de 100%)' },
  { id: 'mint',     label: '민트',    value: 'linear-gradient(160deg, #d4edda 0%, #98d0ae 100%)' },
  { id: 'peach',    label: '피치',    value: 'linear-gradient(160deg, #fde8d8 0%, #f0b890 100%)' },
  { id: 'rose',     label: '로즈',    value: 'linear-gradient(160deg, #f9d6e0 0%, #e890a8 100%)' },
  { id: 'ocean',    label: '오션',    value: 'linear-gradient(160deg, #c9e8f0 0%, #88c5da 100%)' },
  { id: 'sunset',   label: '선셋',    value: 'linear-gradient(160deg, #fda085 0%, #f6d365 100%)' },
  { id: 'night',    label: '나이트',  value: 'linear-gradient(160deg, #2d1b69 0%, #11998e 100%)' },
  { id: 'forest',   label: '포레스트',value: 'linear-gradient(160deg, #134e5e 0%, #71b280 100%)' },
  { id: 'cherry',   label: '체리',    value: 'linear-gradient(160deg, #eb3349 0%, #f45c43 100%)' },
  { id: 'grape',    label: '그레이프',value: 'linear-gradient(160deg, #4776e6 0%, #8e54e9 100%)' },
  { id: 'sand',     label: '샌드',    value: 'linear-gradient(160deg, #f5e6c8 0%, #d4b483 100%)' },
  { id: 'slate',    label: '슬레이트',value: 'linear-gradient(160deg, #d7dee8 0%, #a0afc4 100%)' },
  { id: 'aurora',   label: '오로라',  value: 'linear-gradient(160deg, #00c6fb 0%, #005bea 100%)' },
  { id: 'dusk',     label: '황혼',    value: 'linear-gradient(160deg, #fd746c 0%, #ff9068 50%, #a18cd1 100%)' },
];

export default function Sidebar() {
  const {
    boards, currentBoard,
    sbOpen, mobileSbOpen,
    selectBoard, toggleSidebar, closeMobileSidebar,
    boardsLoading,
  } = useKanban();
  const [createOpen, setCreateOpen] = useState(false);

  const cls = [
    'sidebar',
    !sbOpen        ? 'collapsed'    : '',
    mobileSbOpen   ? 'mobile-open'  : '',
  ].filter(Boolean).join(' ');

  const privateBoards = boards.filter(b => b.type === 'private');
  const sharedBoards  = boards.filter(b => b.type === 'shared');
  const teamBoards    = boards.filter(b => b.type === 'team');

  return (
    <>
      {createOpen && <CreateBoardModal onClose={() => setCreateOpen(false)} />}
      {mobileSbOpen && <div className="sb-overlay" onClick={closeMobileSidebar} />}
      <aside className={cls}>
        <div className="sb-header">
          <div className="sb-logo">
            <img src="/gpvc-logo.svg" alt="GPVC" style={{ height: 18, display: 'block' }} />
          </div>
          <button className="sb-toggle" onClick={toggleSidebar} title="닫기">
            <i className="ti ti-chevrons-left" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="sb-scroll">
          {boardsLoading ? (
            <SidebarSkeleton />
          ) : (
            <>
              <div className="sb-section">
                <div className="sb-section-title">개인 보드</div>
                {privateBoards.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 8px 4px' }}>
                    보드 없음
                  </div>
                )}
                {privateBoards.map(b => (
                  <BoardItem
                    key={b.id}
                    board={b}
                    active={currentBoard?.id === b.id}
                    onSelect={selectBoard}
                  />
                ))}
              </div>
              {sharedBoards.length > 0 && (
                <div className="sb-section">
                  <div className="sb-section-title">공유 보드</div>
                  {sharedBoards.map(b => (
                    <BoardItem
                      key={b.id}
                      board={b}
                      active={currentBoard?.id === b.id}
                      onSelect={selectBoard}
                    />
                  ))}
                </div>
              )}
              <div className="sb-section">
                <div className="sb-section-title">팀 보드</div>
                {teamBoards.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 8px 4px' }}>
                    보드 없음
                  </div>
                )}
                {teamBoards.map(b => (
                  <BoardItem
                    key={b.id}
                    board={b}
                    active={currentBoard?.id === b.id}
                    onSelect={selectBoard}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 새 보드 만들기 */}
        <div style={{ padding: '8px 10px 12px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '7px 10px',
              borderRadius: 8, border: '1px dashed var(--border2)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 12, color: 'var(--text3)',
              transition: 'all .12s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--purple)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--purple-text)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)';
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 13 }} />
            새 보드 만들기
          </button>
        </div>
      </aside>
    </>
  );
}

// ── 보드 항목 (메뉴: 이름 수정 / 색상 변경 / 삭제) ─────────────────

function BoardItem({
  board, active, onSelect,
}: {
  board: FirestoreBoard;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const { updateBoard, deleteBoard, updateBoardMembers, updateBoardBackground, orgUsers } = useKanban();
  const { user } = useAuth();
  const dot = COL_DOTS[board.color] ?? '#888';
  const isOwner = board.ownerId === user?.uid;

  const [hovered,   setHovered]   = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [menuMode,  setMenuMode]  = useState<'main' | 'color' | 'confirm' | 'members' | 'bg'>('main');
  const [renaming,  setRenaming]  = useState(false);
  const [renameVal, setRenameVal] = useState(board.name);
  // 멤버 관리 로컬 상태
  const [memberDraft, setMemberDraft] = useState<string[]>([]);

  const menuRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // board.name이 외부에서 바뀌면 로컬 값도 동기화
  useEffect(() => { setRenameVal(board.name); }, [board.name]);
  useEffect(() => { if (renaming) inputRef.current?.focus(); }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMenuMode('main');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(p => !p);
    setMenuMode('main');
  }

  async function handleRenameSubmit() {
    const v = renameVal.trim();
    setRenaming(false);
    if (!v || v === board.name) { setRenameVal(board.name); return; }
    await updateBoard(board.id, { name: v });
  }

  async function handleColorSelect(colorKey: string) {
    setMenuOpen(false);
    setMenuMode('main');
    if (colorKey !== board.color) await updateBoard(board.id, { color: colorKey });
  }

  function openMemberPanel() {
    setMemberDraft(board.memberIds.filter(id => id !== '__team__' && id !== board.ownerId));
    setMenuMode('members');
  }

  async function saveMemberPanel() {
    // ownerId는 항상 포함
    const newMemberIds = [...new Set([board.ownerId, ...memberDraft])];
    const newType: 'private' | 'shared' | 'team' =
      memberDraft.length > 0 ? 'shared' : 'private';
    setMenuOpen(false);
    setMenuMode('main');
    await updateBoardMembers(board.id, newMemberIds, newType);
  }

  function toggleMemberDraft(uid: string) {
    setMemberDraft(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  }

  async function handleDeleteConfirm() {
    setMenuOpen(false);
    await deleteBoard(board.id);
  }

  return (
    <div
      className={`board-item${active ? ' active' : ''}`}
      onClick={() => !renaming && onSelect(board.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <div className="board-dot" style={{ background: dot }} />

      {renaming ? (
        <input
          ref={inputRef}
          value={renameVal}
          onChange={e => setRenameVal(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleRenameSubmit(); }
            if (e.key === 'Escape') { setRenameVal(board.name); setRenaming(false); }
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, fontSize: 13, fontFamily: 'inherit',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--purple)',
            outline: 'none', color: 'var(--text)', padding: '1px 0',
          }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="board-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</div>
          {board.type === 'shared' && (
            <i className="ti ti-users" style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }} title="공유 보드" />
          )}
        </div>
      )}

      {/* ··· 메뉴 버튼 */}
      {!renaming && (
        <button
          onClick={openMenu}
          title="보드 메뉴"
          style={{
            marginLeft: 'auto', flexShrink: 0,
            background: 'none', border: 'none',
            cursor: 'pointer', padding: '2px 4px',
            color: 'var(--text3)', borderRadius: 5, lineHeight: 1,
            opacity: hovered || menuOpen ? 1 : 0,
            pointerEvents: hovered || menuOpen ? 'auto' : 'none',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
        >
          <i className="ti ti-dots" style={{ fontSize: 14 }} />
        </button>
      )}

      {/* 드롭다운 */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 2px)', right: 0, zIndex: 300,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.13)',
            minWidth: 164, padding: 4,
          }}
        >
          {menuMode === 'main' && (
            <>
              <MenuBtn icon="ti-pencil" label="이름 수정" onClick={() => {
                setMenuOpen(false);
                setRenameVal(board.name);
                setRenaming(true);
              }} />
              <MenuBtn icon="ti-palette" label="색상 변경" onClick={() => setMenuMode('color')} />
              <MenuBtn icon="ti-photo" label="배경 변경" onClick={() => setMenuMode('bg')} />
              {isOwner && board.type !== 'team' && (
                <MenuBtn icon="ti-users" label="멤버 관리" onClick={openMemberPanel} />
              )}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <MenuBtn icon="ti-trash" label="보드 삭제" danger onClick={() => setMenuMode('confirm')} />
            </>
          )}

          {menuMode === 'color' && (
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>색상 선택</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {Object.entries(COL_DOTS).map(([key, hex]) => (
                  <button
                    key={key}
                    onClick={() => handleColorSelect(key)}
                    title={key}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: hex,
                      border: board.color === key
                        ? '2px solid var(--purple)' : '2px solid transparent',
                      cursor: 'pointer', outline: 'none',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setMenuMode('main')}
                style={{
                  marginTop: 8, fontSize: 11, color: 'var(--text3)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                ← 돌아가기
              </button>
            </div>
          )}

          {menuMode === 'bg' && (
            <div style={{ padding: '8px 10px', minWidth: 190 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>보드 배경</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {BG_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    title={preset.label}
                    onClick={async () => {
                      setMenuOpen(false);
                      setMenuMode('main');
                      await updateBoardBackground(board.id, preset.value);
                    }}
                    style={{
                      width: 44, height: 30, borderRadius: 6, cursor: 'pointer',
                      background: preset.value || 'var(--surface2)',
                      border: (board.bg ?? '') === preset.value
                        ? '2px solid var(--purple)' : '2px solid transparent',
                      outline: 'none', position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {!preset.value && (
                      <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>없음</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {BG_PRESETS.filter(p => p.value).map(p => (
                  <span key={p.id} style={{ fontSize: 10, color: 'var(--text3)' }}>{p.label}</span>
                ))}
              </div>
              <button
                onClick={() => setMenuMode('main')}
                style={{
                  marginTop: 8, fontSize: 11, color: 'var(--text3)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                ← 돌아가기
              </button>
            </div>
          )}

          {menuMode === 'members' && (
            <div style={{ padding: '8px 10px', minWidth: 200 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                멤버 관리
              </div>
              {/* 오너 표시 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', opacity: 0.6 }}>
                <Avatar userId={board.ownerId} size={22} />
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>
                  {orgUsers.find(u => u.uid === board.ownerId)?.name ?? '소유자'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--purple)', background: 'var(--purple-light)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                  소유자
                </span>
              </div>
              {/* 다른 구성원 토글 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 180, overflowY: 'auto', margin: '6px 0' }}>
                {orgUsers.filter(u => u.uid !== board.ownerId).map(u => {
                  const checked = memberDraft.includes(u.uid);
                  return (
                    <label
                      key={u.uid}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px',
                        borderRadius: 6, cursor: 'pointer',
                        background: checked ? 'var(--purple-light)' : 'transparent',
                        transition: 'background .1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMemberDraft(u.uid)}
                        style={{ accentColor: 'var(--purple)', flexShrink: 0 }}
                      />
                      <Avatar userId={u.uid} size={20} />
                      <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                <button
                  onClick={saveMemberPanel}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: 12, fontFamily: 'inherit',
                    background: 'var(--purple)', color: '#fff',
                    border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  저장
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setMenuMode('main'); }}
                  style={{
                    padding: '5px 10px', fontSize: 12, fontFamily: 'inherit',
                    background: 'var(--surface2)', color: 'var(--text)',
                    border: '1px solid var(--border2)', borderRadius: 7, cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {menuMode === 'confirm' && (
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                <strong style={{ color: 'var(--text)' }}>보드를 삭제할까요?</strong><br />
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>모든 카드도 함께 삭제됩니다.</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleDeleteConfirm}
                  style={{
                    flex: 1, padding: '5px 8px', fontSize: 12,
                    background: '#D84040', color: '#fff',
                    border: 'none', borderRadius: 7, cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
                <button
                  onClick={() => setMenuMode('main')}
                  className="btn"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuBtn({
  icon, label, onClick, danger,
}: {
  icon: string; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        width: '100%', padding: '6px 10px', border: 'none', borderRadius: 7,
        cursor: 'pointer', background: 'none',
        color: danger ? '#D84040' : 'var(--text)', fontSize: 13, textAlign: 'left',
        transition: 'background .1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#FCEBEB' : 'var(--surface2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
      {label}
    </button>
  );
}

function SidebarSkeleton() {
  return (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: 32, borderRadius: 8,
            background: 'var(--surface2)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}
