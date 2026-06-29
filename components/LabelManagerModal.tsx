'use client';

import { useRef, useState, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import { LABEL_COLOR_PRESETS } from '../lib/data';
import type { BoardLabel } from '../lib/types';

interface Props {
  onClose: () => void;
}

export default function LabelManagerModal({ onClose }: Props) {
  const { currentBoard, addBoardLabel, updateBoardLabel, deleteBoardLabel } = useKanban();

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!currentBoard) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={handleOverlayClick}
      style={{ zIndex: 500 }}
    >
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-head">
          <div className="modal-title-block">
            <div className="modal-title">라벨 관리</div>
            <div className="modal-col-badge">
              <i className="ti ti-tag" style={{ fontSize: 12 }} />
              <span>{currentBoard.name}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 8 }}>
          {/* 기존 라벨 목록 */}
          {currentBoard.labels.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0', textAlign: 'center' }}>
              아직 라벨이 없습니다. 아래에서 추가해보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentBoard.labels.map(label => (
                <LabelRow
                  key={label.id}
                  label={label}
                  onUpdate={(name, bg, c) => updateBoardLabel(label.id, name, bg, c)}
                  onDelete={() => deleteBoardLabel(label.id)}
                />
              ))}
            </div>
          )}

          {/* 구분선 */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* 새 라벨 추가 */}
          <AddLabelForm onAdd={(name, bg, c) => addBoardLabel(name, bg, c)} />
        </div>
      </div>
    </div>
  );
}

// ── 기존 라벨 행 (표시 / 수정 토글) ─────────────────────────────

function LabelRow({
  label, onUpdate, onDelete,
}: {
  label: BoardLabel;
  onUpdate: (name: string, bg: string, c: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing,  setEditing]  = useState(false);
  const [nameVal,  setNameVal]  = useState(label.name);
  const [colorIdx, setColorIdx] = useState(
    LABEL_COLOR_PRESETS.findIndex(p => p.bg === label.bg && p.c === label.c)
  );
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const selectedColor = LABEL_COLOR_PRESETS[colorIdx] ?? LABEL_COLOR_PRESETS[0];

  function handleCancel() {
    setNameVal(label.name);
    setColorIdx(LABEL_COLOR_PRESETS.findIndex(p => p.bg === label.bg && p.c === label.c));
    setEditing(false);
  }

  async function handleSave() {
    if (!nameVal.trim() || saving) return;
    setSaving(true);
    try {
      await onUpdate(nameVal.trim(), selectedColor.bg, selectedColor.c);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div style={{
        padding: '10px 12px', border: '1px solid var(--purple)',
        borderRadius: 10, background: 'var(--purple-light)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          style={{
            width: '100%', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '6px 10px', fontSize: 13,
            fontFamily: 'inherit', background: 'var(--surface)',
            color: 'var(--text)', outline: 'none',
          }}
        />
        <ColorPicker selected={colorIdx} onChange={setColorIdx} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, flex: 1, justifyContent: 'center' }}
            onClick={handleSave}
            disabled={!nameVal.trim() || saving}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          <button className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleCancel}>
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 9,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <span
        className="label"
        style={{ background: label.bg, color: label.c, fontSize: 12, flex: 1 }}
      >
        {label.name}
      </span>
      <button
        onClick={() => setEditing(true)}
        title="수정"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '2px 4px', borderRadius: 5, lineHeight: 1 }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
      >
        <i className="ti ti-pencil" style={{ fontSize: 14 }} />
      </button>
      <button
        onClick={onDelete}
        title="삭제"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '2px 4px', borderRadius: 5, lineHeight: 1 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#D84040')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
      >
        <i className="ti ti-trash" style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}

// ── 새 라벨 추가 폼 ───────────────────────────────────────────────

function AddLabelForm({ onAdd }: { onAdd: (name: string, bg: string, c: string) => Promise<void> }) {
  const [name,     setName]     = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [saving,   setSaving]   = useState(false);

  const selectedColor = LABEL_COLOR_PRESETS[colorIdx] ?? LABEL_COLOR_PRESETS[0];

  async function handleAdd() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(name.trim(), selectedColor.bg, selectedColor.c);
      setName('');
      setColorIdx(0);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="sec-title">새 라벨 추가</div>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        placeholder="라벨 이름 (예: 긴급, 검토 필요)"
        style={{
          width: '100%', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '7px 10px', fontSize: 13,
          fontFamily: 'inherit', background: 'var(--surface2)',
          color: 'var(--text)', outline: 'none',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--purple)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border2)')}
      />

      <ColorPicker selected={colorIdx} onChange={setColorIdx} />

      {/* 미리보기 */}
      {name.trim() && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
          <span>미리보기:</span>
          <span className="label" style={{ background: selectedColor.bg, color: selectedColor.c, fontSize: 11 }}>
            {name}
          </span>
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ fontSize: 13, justifyContent: 'center' }}
        onClick={handleAdd}
        disabled={!name.trim() || saving}
      >
        {saving
          ? <><i className="ti ti-loader-2" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />추가 중…</>
          : <><i className="ti ti-plus" style={{ fontSize: 13 }} />라벨 추가</>
        }
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── 색상 프리셋 선택기 ─────────────────────────────────────────────

function ColorPicker({ selected, onChange }: { selected: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {LABEL_COLOR_PRESETS.map((preset, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: preset.bg, border: `2px solid ${preset.c}`,
            outline: selected === i ? `3px solid var(--purple)` : 'none',
            outlineOffset: 1,
            cursor: 'pointer', transition: 'outline .1s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {selected === i && <i className="ti ti-check" style={{ fontSize: 12, color: preset.c }} />}
        </button>
      ))}
    </div>
  );
}
