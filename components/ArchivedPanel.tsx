'use client';

import { useState } from 'react';
import { useKanban } from '../context/KanbanContext';
import Avatar from './Avatar';

export default function ArchivedPanel() {
  const {
    archivedTasks, currentBoard,
    showArchive, toggleArchive,
    restoreTask, deleteTask,
  } = useKanban();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!showArchive || !currentBoard) return null;

  async function handlePermanentDelete(taskId: string) {
    await deleteTask(taskId);
    setConfirmDeleteId(null);
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.28)', zIndex: 180,
        }}
        onClick={toggleArchive}
      />

      {/* 패널 */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 190,
        width: 360, maxWidth: '100vw',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-6px 0 28px rgba(0,0,0,.14)',
        display: 'flex', flexDirection: 'column',
        animation: 'archivePanelIn .2s ease',
      }}>

        {/* 헤더 */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <i className="ti ti-archive" style={{ fontSize: 19, color: 'var(--text3)' }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>아카이브</span>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 2 }}>
            {archivedTasks.length}개
          </span>
          <button
            onClick={toggleArchive}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text3)', padding: '4px 5px',
              borderRadius: 7, lineHeight: 1, transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* 카드 목록 */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {archivedTasks.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12,
              color: 'var(--text3)', padding: '48px 0',
            }}>
              <i className="ti ti-archive-off" style={{ fontSize: 38 }} />
              <span style={{ fontSize: 13 }}>아카이브된 카드가 없습니다</span>
            </div>
          ) : (
            archivedTasks.map(task => {
              const col = currentBoard.columns.find(c => c.id === task.columnId);
              const isConfirming = confirmDeleteId === task.id;
              return (
                <div key={task.id} style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, lineHeight: 1.4 }}>
                    {task.title}
                  </div>

                  {/* 컬럼 배지 + 담당자 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 11, color: 'var(--text3)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className="ti ti-layout-columns" style={{ fontSize: 11 }} />
                      {col ? col.name : '(컬럼 없음)'}
                    </span>
                    {task.assignees.length > 0 && (
                      <div style={{ display: 'flex', marginLeft: 'auto' }}>
                        {task.assignees.map(uid => (
                          <Avatar key={uid} userId={uid} size={20} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  {isConfirming ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', flex: 1 }}>
                        영구 삭제할까요?
                      </span>
                      <button
                        onClick={() => handlePermanentDelete(task.id)}
                        style={{
                          padding: '4px 10px', fontSize: 12, fontFamily: 'inherit',
                          background: '#D84040', color: '#fff',
                          border: 'none', borderRadius: 7, cursor: 'pointer',
                        }}
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          padding: '4px 8px', fontSize: 12, fontFamily: 'inherit',
                          background: 'var(--surface)', color: 'var(--text)',
                          border: '1px solid var(--border2)', borderRadius: 7, cursor: 'pointer',
                        }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => restoreTask(task.id)}
                        style={{
                          flex: 1, padding: '5px 0', fontSize: 12, fontFamily: 'inherit',
                          background: 'var(--purple-light)', color: 'var(--purple-text)',
                          border: '1px solid var(--purple)', borderRadius: 7, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          transition: 'background .12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#e0dcfd')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--purple-light)')}
                      >
                        <i className="ti ti-rotate-clockwise" style={{ fontSize: 12 }} />
                        복원
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(task.id)}
                        style={{
                          padding: '5px 10px', fontSize: 12, fontFamily: 'inherit',
                          background: 'none', color: '#D84040',
                          border: '1px solid #ffb3b3', borderRadius: 7, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          transition: 'background .12s, border-color .12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.borderColor = '#D84040'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#ffb3b3'; }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes archivePanelIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
