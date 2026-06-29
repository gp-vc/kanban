'use client';

import { useRef, useState, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from './Avatar';
import AddCardModal from './AddCardModal';
import CreateBoardModal from './CreateBoardModal';
import BoardMembersModal from './BoardMembersModal';
import NotificationBell from './NotificationBell';
import FilterPanel from './FilterPanel';

export default function Topbar() {
  const {
    currentBoard, toggleSidebar,
    searchQuery, setSearchQuery,
    archivedTasks, showArchive, toggleArchive,
    boardLocked, toggleBoardLock,
    activeFilterCount,
  } = useKanban();
  const { user, signOut }               = useAuth();
  const { theme, toggleTheme }          = useTheme();
  const [cardModalOpen,    setCardModalOpen]    = useState(false);
  const [boardModalOpen,   setBoardModalOpen]   = useState(false);
  const [userMenuOpen,     setUserMenuOpen]     = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [filterOpen,       setFilterOpen]       = useState(false);
  const menuRef       = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  function handleAddClick() {
    if (currentBoard) {
      setCardModalOpen(true);
    } else {
      setBoardModalOpen(true);
    }
  }

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? '';

  return (
    <>
      <div className="topbar">
        <button className="menu-btn" onClick={toggleSidebar}>
          <i className="ti ti-menu-2" style={{ fontSize: 20 }} />
        </button>

        <div className="board-title">
          {currentBoard?.name ?? '보드를 선택하세요'}
        </div>

        <div className="topbar-right">
          {/* 보드 잠금 버튼 */}
          {currentBoard && (
            <button
              className="btn"
              style={{ padding: '7px 10px' }}
              title={boardLocked ? '보드 잠금 해제' : '카드 순서 고정 (드래그 잠금)'}
              onClick={toggleBoardLock}
            >
              <i
                className={`ti ${boardLocked ? 'ti-lock' : 'ti-lock-open'}`}
                style={{ fontSize: 14, color: boardLocked ? 'var(--purple)' : undefined }}
              />
            </button>
          )}

          {/* 아카이브 버튼 */}
          {currentBoard && (
            <button
              className="btn topbar-archive-btn"
              style={{ padding: '7px 10px', position: 'relative' }}
              title="아카이브"
              onClick={toggleArchive}
            >
              <i className="ti ti-archive" style={{ fontSize: 14, color: showArchive ? 'var(--purple)' : undefined }} />
              {archivedTasks.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'var(--purple)', color: '#fff',
                  borderRadius: '50%', width: 14, height: 14,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>
                  {archivedTasks.length > 9 ? '9+' : archivedTasks.length}
                </span>
              )}
            </button>
          )}

          {/* 카드 검색 */}
          {currentBoard && (
            searchOpen ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface2)',
                border: `1px solid ${searchQuery ? 'var(--purple)' : 'var(--border2)'}`,
                borderRadius: 9, padding: '5px 10px', width: 200, flexShrink: 0,
                boxShadow: searchQuery ? '0 0 0 2px var(--purple-light)' : 'none',
                transition: 'border-color .15s, box-shadow .15s',
              }}>
                <i className="ti ti-search" style={{ fontSize: 14, color: searchQuery ? 'var(--purple)' : 'var(--text3)', flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); }
                  }}
                  placeholder="카드 검색..."
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', flex: 1, minWidth: 0,
                  }}
                />
                <button
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border2)',
                    borderRadius: 6, cursor: 'pointer', color: 'var(--text3)',
                    padding: '2px 5px', lineHeight: 1, flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                  title="검색 닫기"
                >
                  <i className="ti ti-x" style={{ fontSize: 12 }} />
                </button>
              </div>
            ) : (
              <button
                className="btn"
                style={{ padding: '7px 10px' }}
                title="카드 검색"
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
              >
                <i className="ti ti-search" style={{ fontSize: 14 }} />
              </button>
            )
          )}

          {/* 필터 버튼 */}
          {currentBoard && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn"
                style={{ padding: '7px 10px', position: 'relative' }}
                title="카드 필터"
                onClick={() => setFilterOpen(p => !p)}
              >
                <i
                  className="ti ti-filter"
                  style={{ fontSize: 14, color: activeFilterCount > 0 ? 'var(--purple)' : undefined }}
                />
                {activeFilterCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'var(--purple)', color: '#fff',
                    borderRadius: '50%', width: 14, height: 14,
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterOpen && <FilterPanel onClose={() => setFilterOpen(false)} />}
            </div>
          )}

          {/* 멤버 스택 + 관리 버튼 */}
          <div className="topbar-members" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="member-stack">
              {(currentBoard?.memberIds ?? []).filter(id => id !== '__team__').map(uid => (
                <Avatar key={uid} userId={uid} size={28} />
              ))}
            </div>
            {currentBoard && currentBoard.type !== 'team' && currentBoard.ownerId === user?.uid && (
              <button
                className="btn"
                style={{ padding: '4px 7px', fontSize: 12, gap: 4 }}
                title="멤버 관리"
                onClick={() => setMembersModalOpen(true)}
              >
                <i className="ti ti-user-plus" style={{ fontSize: 14 }} />
              </button>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleAddClick}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} />
            {currentBoard ? '카드 추가' : '보드 만들기'}
          </button>

          {/* 알림 벨 */}
          <NotificationBell />

          {/* 유저 위젯 */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: userMenuOpen ? 'var(--surface2)' : 'none',
                border: '1px solid transparent', borderRadius: 10,
                padding: '4px 8px 4px 4px',
                cursor: 'pointer', transition: 'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = 'none'; }}
            >
              <Avatar userId={user?.uid ?? ''} size={28} />
              <span className="topbar-username" style={{ fontSize: 13, color: 'var(--text)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
              <i className="ti ti-chevron-down topbar-chevron" style={{ fontSize: 12, color: 'var(--text3)' }} />
            </button>

            {userMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 400,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.12)',
                minWidth: 200, padding: 6,
              }}>
                {/* 유저 정보 */}
                <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Avatar userId={user?.uid ?? ''} size={36} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                        {user?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 다크모드 토글 */}
                <button
                  onClick={toggleTheme}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 10px', border: 'none', borderRadius: 7,
                    cursor: 'pointer', background: 'none',
                    color: 'var(--text)', fontSize: 13, textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 15, color: 'var(--text3)' }} />
                  {theme === 'dark' ? '라이트 모드' : '다크 모드'}
                </button>

                {/* 로그아웃 */}
                <button
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 10px', border: 'none', borderRadius: 7,
                    cursor: 'pointer', background: 'none', marginTop: 4,
                    color: 'var(--text)', fontSize: 13, textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <i className="ti ti-logout" style={{ fontSize: 15, color: 'var(--text3)' }} />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {cardModalOpen    && <AddCardModal     onClose={() => setCardModalOpen(false)}  />}
      {boardModalOpen   && <CreateBoardModal  onClose={() => setBoardModalOpen(false)} />}
      {membersModalOpen && currentBoard && (
        <BoardMembersModal board={currentBoard} onClose={() => setMembersModalOpen(false)} />
      )}
    </>
  );
}
