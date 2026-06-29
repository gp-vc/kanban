'use client';

import { useRef, useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useKanban } from '../context/KanbanContext';
import { COL_DOTS } from '../lib/data';
import Column from './Column';

export default function BoardArea() {
  const {
    currentBoard, colState,
    moveTask, reorderColumns,
    boardsLoading, tasksLoading,
    boardLocked,
  } = useKanban();
  const [addingCol, setAddingCol] = useState(false);

  function handleDragEnd(result: DropResult) {
    if (boardLocked) return;
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'COLUMN') {
      reorderColumns(source.index, destination.index);
      return;
    }

    moveTask(draggableId, source.droppableId, destination.droppableId, destination.index);
  }

  if (boardsLoading) {
    return (
      <div className="board-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BoardLoadingSpinner label="보드 목록을 불러오는 중..." />
      </div>
    );
  }

  if (!currentBoard) {
    return (
      <div className="board-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--text3)' }}>
          <i className="ti ti-layout-kanban" style={{ fontSize: 44 }} />
          <span>좌측에서 보드를 선택하세요</span>
        </div>
      </div>
    );
  }

  if (tasksLoading) {
    return (
      <div className="board-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BoardLoadingSpinner label="카드를 불러오는 중..." />
      </div>
    );
  }

  const columns = currentBoard.columns.map(c => colState[c.id]).filter(Boolean);

  return (
    <div
      className="board-area"
      style={currentBoard.bg ? { background: currentBoard.bg } : undefined}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div
              className="cols-wrap"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {columns.map((col, index) => (
                <Column key={col.id} column={col} index={index} locked={boardLocked} />
              ))}
              {provided.placeholder}

              {addingCol ? (
                <AddColumnForm onClose={() => setAddingCol(false)} />
              ) : (
                <button className="add-col-btn" onClick={() => setAddingCol(true)}>
                  <i className="ti ti-plus" style={{ fontSize: 15 }} />
                  컬럼 추가
                </button>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

// ── 인라인 컬럼 추가 폼 ──────────────────────────────────────────

const COLOR_OPTIONS = Object.entries(COL_DOTS);

function AddColumnForm({ onClose }: { onClose: () => void }) {
  const { addColumn } = useKanban();
  const [name,   setName]   = useState('');
  const [color,  setColor]  = useState('purple');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleAdd() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await addColumn(name.trim(), color);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className="add-col-btn"
      style={{
        height: 'auto', cursor: 'default',
        display: 'flex', flexDirection: 'column',
        alignItems: 'stretch', gap: 8,
        padding: '12px', justifyContent: 'flex-start',
      }}
    >
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="컬럼 이름"
        style={{
          width: '100%', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '7px 10px', fontSize: 13,
          fontFamily: 'inherit', background: 'var(--surface)',
          color: 'var(--text)', outline: 'none',
          boxShadow: '0 0 0 2px var(--purple)',
        }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {COLOR_OPTIONS.map(([key, dotColor]) => (
          <button
            key={key}
            type="button"
            title={key}
            onClick={() => setColor(key)}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: dotColor, cursor: 'pointer',
              border: color === key ? '3px solid var(--purple)' : '2px solid transparent',
              outline: color === key ? '2px solid var(--surface)' : 'none',
              outlineOffset: -3, transition: 'all .1s', flexShrink: 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12, flex: 1, justifyContent: 'center', padding: '5px 0' }}
          onClick={handleAdd}
          disabled={!name.trim() || saving}
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

function BoardLoadingSpinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text3)' }}>
      <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 13 }}>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
