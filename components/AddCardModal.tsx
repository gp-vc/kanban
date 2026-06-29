'use client';

import { useState, useRef, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import { COL_DOTS } from '../lib/data';

interface Props {
  onClose: () => void;
}

export default function AddCardModal({ onClose }: Props) {
  const { currentBoard, addTask } = useKanban();
  const [title,    setTitle]    = useState('');
  const [columnId, setColumnId] = useState(currentBoard?.columns[0]?.id ?? '');
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // currentBoard가 바뀔 때 기본 컬럼 동기화
  useEffect(() => {
    if (currentBoard && !columnId) {
      setColumnId(currentBoard.columns[0]?.id ?? '');
    }
  }, [currentBoard, columnId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !columnId || saving) return;
    setSaving(true);
    try {
      await addTask(columnId, title.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!currentBoard) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={handleOverlayClick}
      style={{ zIndex: 300 }}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        {/* 헤더 */}
        <div className="modal-head">
          <div className="modal-title-block">
            <div className="modal-title">새 카드 추가</div>
            <div className="modal-col-badge">
              <i className="ti ti-layout-kanban" style={{ fontSize: 12 }} />
              <span>{currentBoard.name}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: 14 }}>

            {/* 제목 */}
            <div>
              <div className="sec-title" style={{ marginBottom: 6 }}>카드 제목 *</div>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="무엇을 해야 하나요?"
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
                  transition: 'border-color .15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--purple)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--border2)')}
              />
            </div>

            {/* 컬럼 선택 */}
            <div>
              <div className="sec-title" style={{ marginBottom: 6 }}>추가할 컬럼</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentBoard.columns.map(col => {
                  const dot     = COL_DOTS[col.color] ?? '#888';
                  const checked = columnId === col.id;
                  return (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 11px',
                        border: `1px solid ${checked ? 'var(--purple)' : 'var(--border)'}`,
                        borderRadius: 9,
                        cursor: 'pointer',
                        background: checked ? 'var(--purple-light)' : 'var(--surface2)',
                        transition: 'all .12s',
                      }}
                    >
                      <input
                        type="radio"
                        name="column"
                        value={col.id}
                        checked={checked}
                        onChange={() => setColumnId(col.id)}
                        style={{ accentColor: 'var(--purple)' }}
                      />
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: checked ? 'var(--purple-text)' : 'var(--text)', fontWeight: checked ? 500 : 400 }}>
                        {col.name}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>
                        {col.taskIds.length}개
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>
            <button type="button" className="btn" onClick={onClose} style={{ fontSize: 13 }}>
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || saving}
              style={{ fontSize: 13 }}
            >
              {saving
                ? <><i className="ti ti-loader-2" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />추가 중…</>
                : <><i className="ti ti-plus" style={{ fontSize: 13 }} />카드 추가</>
              }
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
