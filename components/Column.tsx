'use client';

import { useRef, useState, useEffect } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useKanban } from '../context/KanbanContext';
import { COL_DOTS } from '../lib/data';
import Card from './Card';
import type { ColumnState } from '../lib/types';

interface Props {
  column: ColumnState;
  index: number;
  locked?: boolean;
}

export default function Column({ column, index, locked }: Props) {
  const { tasks, renameColumn, deleteColumn, searchQuery, cardFilter } = useKanban();

  const visibleTaskIds = column.tasks.filter(tid => {
    const t = tasks[tid];
    if (!t) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
    }
    if (cardFilter.assignees.length > 0 && !cardFilter.assignees.some(uid => t.assignees.includes(uid))) return false;
    if (cardFilter.priorities.length > 0 && (t.priority == null || !cardFilter.priorities.includes(t.priority))) return false;
    if (cardFilter.labelIds.length > 0 && !cardFilter.labelIds.some(lid => t.labels.includes(lid))) return false;
    return true;
  });
  const [isAdding,   setIsAdding]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal,  setRenameVal]  = useState(column.name);
  const menuRef   = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const dot = COL_DOTS[column.color] ?? '#888';

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDel(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  useEffect(() => {
    if (!isRenaming) setRenameVal(column.name);
  }, [column.name, isRenaming]);

  async function handleRename() {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === column.name) {
      setRenameVal(column.name);
      setIsRenaming(false);
      return;
    }
    setIsRenaming(false);
    await renameColumn(column.id, trimmed);
  }

  async function handleDelete() {
    setMenuOpen(false);
    await deleteColumn(column.id);
  }

  function openRename() {
    setMenuOpen(false);
    setRenameVal(column.name);
    setIsRenaming(true);
  }

  return (
    <Draggable draggableId={column.id} index={index} isDragDisabled={locked}>
      {(dragProvided) => (
        // 외부 div: Draggable 래퍼 (스타일 없음)
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          style={dragProvided.draggableProps.style}
        >
          <Droppable droppableId={column.id}>
            {(dropProvided, dropSnapshot) => (
              <div className={`column${dropSnapshot.isDraggingOver ? ' drag-over' : ''}`}>

                {/* ── 헤더 (drag handle 적용) ── */}
                <div
                  className="col-header"
                  {...dragProvided.dragHandleProps}
                  style={{ cursor: 'grab' }}
                >
                  <div className="col-dot" style={{ background: dot }} />

                  {isRenaming ? (
                    <input
                      ref={renameRef}
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleRename(); }
                        if (e.key === 'Escape') { setRenameVal(column.name); setIsRenaming(false); }
                      }}
                      onBlur={handleRename}
                      onClick={e => e.stopPropagation()}
                      style={{
                        flex: 1, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                        letterSpacing: '-.15px', border: 'none', outline: 'none',
                        background: 'transparent', color: 'var(--text)', padding: 0,
                        boxShadow: '0 1px 0 var(--purple)', cursor: 'text',
                      }}
                    />
                  ) : (
                    <div
                      className="col-name"
                      onDoubleClick={openRename}
                      title="더블클릭해서 이름 수정"
                    >
                      {column.name}
                    </div>
                  )}

                  <div className="col-count">
                    {searchQuery
                      ? `${visibleTaskIds.length}/${column.tasks.length}`
                      : column.tasks.length}
                  </div>

                  {/* 메뉴 버튼 + 드롭다운 */}
                  <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      className="col-menu-btn"
                      onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); setConfirmDel(false); }}
                    >
                      <i className="ti ti-dots" style={{ fontSize: 15 }} />
                    </button>

                    {menuOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                        zIndex: 500,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                        minWidth: 160, overflow: 'hidden',
                      }}>
                        {confirmDel ? (
                          <ConfirmDelete
                            count={column.tasks.length}
                            onConfirm={handleDelete}
                            onCancel={() => setConfirmDel(false)}
                          />
                        ) : (
                          <>
                            <DropdownItem icon="ti-pencil" label="이름 수정" onClick={openRename} />
                            <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                            <DropdownItem
                              icon="ti-trash"
                              label="컬럼 삭제"
                              danger
                              onClick={() => setConfirmDel(true)}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 카드 목록 ── */}
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className="cards-list"
                >
                  {visibleTaskIds.map((tid, i) => {
                    const task = tasks[tid];
                    return task ? <Card key={tid} task={task} index={i} locked={locked} /> : null;
                  })}
                  {dropProvided.placeholder}
                </div>

                {/* ── 인라인 카드 추가 ── */}
                {isAdding ? (
                  <InlineAddForm columnId={column.id} onClose={() => setIsAdding(false)} />
                ) : (
                  <button className="col-add-btn" onClick={() => setIsAdding(true)}>
                    <i className="ti ti-plus" style={{ fontSize: 13 }} />
                    카드 추가
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
}

// ── 드롭다운 아이템 ────────────────────────────────────────────────

function DropdownItem({
  icon, label, danger, onClick,
}: {
  icon: string; label: string; danger?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 12px',
        border: 'none', background: 'none', cursor: 'pointer',
        fontSize: 13, color: danger ? '#D84040' : 'var(--text)',
        textAlign: 'left', transition: 'background .1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#FFF0F0' : 'var(--surface2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
      {label}
    </button>
  );
}

// ── 삭제 확인 ─────────────────────────────────────────────────────

function ConfirmDelete({
  count, onConfirm, onCancel,
}: {
  count: number; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
        {count > 0
          ? `카드 ${count}개가 함께 삭제됩니다. 계속하시겠습니까?`
          : '이 컬럼을 삭제하시겠습니까?'}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '5px 0', border: 'none', borderRadius: 7,
            background: '#D84040', color: '#fff', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          삭제
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '5px 0', border: '1px solid var(--border2)',
            borderRadius: 7, background: 'var(--surface2)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ── 인라인 카드 추가 폼 ──────────────────────────────────────────

function InlineAddForm({ columnId, onClose }: { columnId: string; onClose: () => void }) {
  const { addTask } = useKanban();
  const [title, setTitle]   = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  async function handleAdd() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addTask(columnId, title.trim());
      setTitle('');
    } finally {
      setSaving(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') onClose();
  }

  return (
    <div style={{ margin: '0 8px 9px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea
        ref={textareaRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="카드 제목을 입력하세요…"
        rows={2}
        style={{
          width: '100%', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '8px 10px', fontSize: 13,
          fontFamily: 'inherit', lineHeight: 1.45, resize: 'none',
          background: 'var(--surface)', color: 'var(--text)', outline: 'none',
          boxShadow: '0 0 0 2px var(--purple)',
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12, padding: '5px 0', flex: 1, justifyContent: 'center' }}
          onClick={handleAdd}
          disabled={!title.trim() || saving}
        >
          {saving ? '추가 중…' : '추가'}
        </button>
        <button
          className="btn"
          style={{ fontSize: 12, padding: '5px 10px' }}
          onClick={onClose}
        >
          <i className="ti ti-x" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}
