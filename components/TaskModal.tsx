'use client';

import { useRef, useState, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import { useAuth } from '../context/AuthContext';
import { fmtDate } from '../lib/utils';
import Avatar from './Avatar';
import LabelManagerModal from './LabelManagerModal';
import type { Task, ActivityLog, FirestoreBoard, UserProfile, Priority } from '../lib/types';

const URL_REGEX = /https?:\/\/[^\s]+/g;

function renderTextWithLinks(text: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--purple)', textDecoration: 'underline', wordBreak: 'break-all' }}
        onClick={e => e.stopPropagation()}
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const PRIORITY_OPTIONS: { value: Priority | ''; label: string; style: React.CSSProperties }[] = [
  { value: '',       label: '없음', style: { background: 'var(--surface2)', color: 'var(--text3)' } },
  { value: 'urgent', label: '긴급', style: { background: 'rgba(239,68,68,0.15)',  color: '#EF4444' } },
  { value: 'high',   label: '높음', style: { background: 'rgba(245,158,11,0.15)', color: '#F59E0B' } },
  { value: 'medium', label: '보통', style: { background: 'rgba(59,130,246,0.15)', color: '#60A5FA' } },
  { value: 'low',    label: '낮음', style: { background: 'rgba(100,116,139,0.15)',color: '#94A3B8' } },
];

// ── 외부 래퍼 ─────────────────────────────────────────────────────

export default function TaskModal() {
  const { modalTaskId, tasks, closeModal } = useKanban();
  if (!modalTaskId) return null;
  const task = tasks[modalTaskId];
  if (!task) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <TaskModalInner key={task.id} task={task} onClose={closeModal} />
    </div>
  );
}

// ── Inner: 모든 편집 상태 보유 ────────────────────────────────────

function TaskModalInner({ task, onClose }: { task: Task; onClose: () => void }) {
  const {
    currentBoard, orgUsers,
    toggleChecklist, updateTask,
    addChecklistItem, deleteChecklistItem, updateChecklistItem,
    saveComment, getColOfTask,
    deleteTask, moveTaskToColumn,
    editComment, deleteComment,
    copyTask, archiveTask,
  } = useKanban();
  const { user: authUser } = useAuth();

  // 제목
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal,  setTitleVal]  = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);

  // 설명
  const [descVal,   setDescVal]   = useState(task.desc);
  const [descDirty, setDescDirty] = useState(false);

  // 체크리스트: 추가
  const [addingItem,  setAddingItem]  = useState(false);
  const [newItemVal,  setNewItemVal]  = useState('');
  const newItemRef = useRef<HTMLInputElement>(null);
  // 체크리스트: 수정
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);
  const [editItemVal, setEditItemVal] = useState('');
  const editItemRef = useRef<HTMLInputElement>(null);

  // 댓글 + @멘션
  const [commentText,   setCommentText]   = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [mentionQuery,  setMentionQuery]  = useState<string | null>(null);
  const [mentionAtPos,  setMentionAtPos]  = useState(0);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // 카드 삭제 확인 / 활동 로그 토글
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(false);
  const [showLogs,          setShowLogs]          = useState(false);

  // 카드 복사
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [copying,        setCopying]        = useState(false);

  // 컬럼 이동 피커
  const [showColPicker, setShowColPicker] = useState(false);

  // 댓글 수정
  const [editCommentIdx, setEditCommentIdx] = useState<number | null>(null);
  const [editCommentVal, setEditCommentVal] = useState('');

  // 피커 / 모달
  const [showLabelPicker,    setShowLabelPicker]    = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showLabelManager,   setShowLabelManager]   = useState(false);

  useEffect(() => { if (titleEdit)  titleRef.current?.focus();  }, [titleEdit]);
  useEffect(() => { if (addingItem) newItemRef.current?.focus(); }, [addingItem]);
  useEffect(() => { if (editItemIdx !== null) editItemRef.current?.focus(); }, [editItemIdx]);

  // ── 핸들러 ──

  async function handleTitleSave() {
    setTitleEdit(false);
    const t = titleVal.trim();
    if (!t || t === task.title) { setTitleVal(task.title); return; }
    await updateTask(task.id, { title: t });
  }

  async function handleDescSave() {
    if (!descDirty) return;
    await updateTask(task.id, { desc: descVal });
    setDescDirty(false);
  }

  async function handleDueChange(val: string) {
    await updateTask(task.id, { due: val || undefined });
  }

  async function handleLabelToggle(labelId: string) {
    const next = task.labels.includes(labelId)
      ? task.labels.filter(l => l !== labelId)
      : [...task.labels, labelId];
    await updateTask(task.id, { labels: next });
  }

  async function handleAssigneeToggle(uid: string) {
    const next = task.assignees.includes(uid)
      ? task.assignees.filter(a => a !== uid)
      : [...task.assignees, uid];
    await updateTask(task.id, { assignees: next });
  }

  async function handleAddItem() {
    if (!newItemVal.trim()) return;
    await addChecklistItem(task.id, newItemVal.trim());
    setNewItemVal('');
    setAddingItem(false);
  }

  async function handleItemEditSave() {
    if (editItemIdx === null) return;
    const t = editItemVal.trim();
    if (t && t !== task.checklist[editItemIdx]?.text) {
      await updateChecklistItem(task.id, editItemIdx, t);
    }
    setEditItemIdx(null);
  }

  async function handleDeleteCard() {
    await deleteTask(task.id);
    onClose();
  }

  async function handleArchiveCard() {
    await archiveTask(task.id);
    onClose();
  }

  async function handleCopyToColumn(targetColId: string) {
    setShowCopyPicker(false);
    setCopying(true);
    try {
      await copyTask(task.id, targetColId);
    } finally {
      setCopying(false);
    }
  }

  async function handleEditCommentSave() {
    if (editCommentIdx === null) return;
    const v = editCommentVal.trim();
    if (v && v !== task.comments[editCommentIdx]?.text) {
      await editComment(task.id, editCommentIdx, v);
    }
    setEditCommentIdx(null);
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setCommentText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursor);
    const m = beforeCursor.match(/@([\w가-힣]*)$/);
    if (m) {
      setMentionQuery(m[1]);
      setMentionAtPos(cursor - m[0].length);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(u: UserProfile) {
    const namePart = u.name.replace(/\s/g, '');
    const before = commentText.slice(0, mentionAtPos);
    const query  = mentionQuery ?? '';
    const after  = commentText.slice(mentionAtPos + 1 + query.length);
    const newText = `${before}@${namePart} ${after}`;
    setCommentText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      const pos = before.length + namePart.length + 2;
      commentRef.current?.setSelectionRange(pos, pos);
      commentRef.current?.focus();
    }, 0);
  }

  async function handleCommentSave() {
    if (!commentText.trim() || commentSaving) return;
    setCommentSaving(true);
    setMentionQuery(null);
    try {
      await saveComment(task.id, commentText.trim());
      setCommentText('');
    } finally {
      setCommentSaving(false);
    }
  }

  const col   = getColOfTask(task.id);
  const doneN = task.checklist.filter(c => c.done).length;
  const pct   = task.checklist.length ? Math.round((doneN / task.checklist.length) * 100) : 0;
  const due   = fmtDate(task.due);

  return (
    <>
      {showLabelManager && (
        <LabelManagerModal onClose={() => setShowLabelManager(false)} />
      )}
      <div className="modal" style={{ maxWidth: 560 }}>

        {/* ── 헤더 ── */}
        <div className="modal-head">
          <div className="modal-title-block" style={{ flex: 1, minWidth: 0 }}>
            {titleEdit ? (
              <input
                ref={titleRef}
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); }
                  if (e.key === 'Escape') { setTitleVal(task.title); setTitleEdit(false); }
                }}
                style={{
                  fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                  border: 'none', borderBottom: '2px solid var(--purple)',
                  outline: 'none', background: 'transparent',
                  color: 'var(--text)', width: '100%', padding: '2px 0',
                }}
              />
            ) : (
              <div
                className="modal-title"
                onClick={() => { setTitleVal(task.title); setTitleEdit(true); }}
                title="클릭해서 제목 수정"
                style={{ cursor: 'text', borderBottom: '2px solid transparent', transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'var(--border2)')}
                onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
              >
                {task.title}
              </div>
            )}
            <div className="modal-col-badge">
              <i className="ti ti-layout-columns" style={{ fontSize: 12 }} />
              <span>{col?.name ?? ''}</span>
            </div>
          </div>
          {/* 카드 복사 */}
          {!confirmDeleteCard && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowCopyPicker(p => !p)}
                title="카드 복사"
                disabled={copying}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copying ? 'var(--purple)' : 'var(--text3)', padding: '4px 6px', borderRadius: 7, lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--purple)'; e.currentTarget.style.background = 'var(--purple-light)'; }}
                onMouseLeave={e => { if (!copying) { e.currentTarget.style.color = 'var(--text3)'; } e.currentTarget.style.background = 'none'; }}
              >
                <i className={`ti ti-${copying ? 'loader-2' : 'copy'}`} style={{ fontSize: 16, ...(copying ? { animation: 'spin 1s linear infinite' } : {}) }} />
              </button>
              {showCopyPicker && (
                <Picker onClose={() => setShowCopyPicker(false)} align="right">
                  <div style={{ padding: '6px 10px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                    복사할 컬럼 선택
                  </div>
                  {(currentBoard?.columns ?? []).map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCopyToColumn(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '7px 10px', border: 'none', borderRadius: 7,
                        cursor: 'pointer', background: 'none', fontSize: 13,
                        color: 'var(--text)', textAlign: 'left', fontFamily: 'inherit', transition: 'background .1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <i className="ti ti-layout-columns" style={{ fontSize: 13, color: 'var(--text3)' }} />
                      <span style={{ flex: 1 }}>{c.name}</span>
                      {c.id === col?.id && <span style={{ fontSize: 11, color: 'var(--text3)' }}>현재</span>}
                    </button>
                  ))}
                </Picker>
              )}
            </div>
          )}

          {/* 아카이브 + 영구 삭제 */}
          {confirmDeleteCard ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>영구 삭제할까요?</span>
              <button
                onClick={handleDeleteCard}
                style={{ fontSize: 12, padding: '4px 10px', background: '#D84040', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                삭제
              </button>
              <button
                className="btn"
                onClick={() => setConfirmDeleteCard(false)}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                취소
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {/* 아카이브 */}
              <button
                onClick={handleArchiveCard}
                title="아카이브 (복원 가능)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px 6px', borderRadius: 7, lineHeight: 1 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--purple-text)'; e.currentTarget.style.background = 'var(--purple-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none'; }}
              >
                <i className="ti ti-archive" style={{ fontSize: 16 }} />
              </button>
              {/* 영구 삭제 */}
              <button
                onClick={() => setConfirmDeleteCard(true)}
                title="영구 삭제"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px 6px', borderRadius: 7, lineHeight: 1 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#D84040'; e.currentTarget.style.background = '#FCEBEB'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none'; }}
              >
                <i className="ti ti-trash" style={{ fontSize: 16 }} />
              </button>
            </div>
          )}
          <button className="modal-close" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="modal-body">

          {/* ── 설명 ── */}
          <div>
            <div className="sec-title">설명</div>
            <textarea
              className="desc-area"
              value={descVal}
              placeholder="카드에 대한 설명을 입력하세요..."
              onChange={e => { setDescVal(e.target.value); setDescDirty(true); }}
              onBlur={handleDescSave}
            />
            {descDirty && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleDescSave}>저장</button>
                <button className="btn" style={{ fontSize: 12 }} onClick={() => { setDescVal(task.desc); setDescDirty(false); }}>취소</button>
              </div>
            )}
          </div>

          {/* ── 우선순위 ── */}
          <div>
            <div className="sec-title" style={{ marginBottom: 6 }}>우선순위</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {PRIORITY_OPTIONS.map(opt => {
                const active = (task.priority ?? '') === opt.value;
                return (
                  <button
                    key={opt.value || 'none'}
                    onClick={() => updateTask(task.id, { priority: opt.value as Priority || undefined })}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: active ? '2px solid currentColor' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit',
                      ...opt.style,
                      opacity: active ? 1 : 0.65,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 속성 그리드 ── */}
          <div className="props-grid">

            {/* 담당자 */}
            <div className="prop-block">
              <div className="prop-label">담당자</div>
              <div style={{ position: 'relative' }}>
                <div
                  className="prop-val"
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 5, height: 'auto', padding: '9px 10px', cursor: 'pointer' }}
                  onClick={() => { setShowAssigneePicker(p => !p); setShowLabelPicker(false); setShowColPicker(false); }}
                >
                  {task.assignees.length > 0 ? task.assignees.map(uid => {
                    const u = orgUsers.find(u => u.uid === uid);
                    return (
                      <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Avatar userId={uid} size={22} />
                        <span style={{ fontSize: 12 }}>
                          {u?.name || u?.email?.split('@')[0] || '(알 수 없음)'}
                        </span>
                      </div>
                    );
                  }) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>미지정</span>}
                  <span style={{ fontSize: 11, color: 'var(--purple-text)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <i className="ti ti-user-plus" style={{ fontSize: 11 }} />
                    {task.assignees.length > 0 ? '수정' : '추가'}
                  </span>
                </div>
                {showAssigneePicker && (
                  <Picker onClose={() => setShowAssigneePicker(false)}>
                    {orgUsers.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>
                        구성원 없음
                      </div>
                    ) : orgUsers.map(u => (
                      <PickerRow key={u.uid} checked={task.assignees.includes(u.uid)} onClick={() => handleAssigneeToggle(u.uid)}>
                        <Avatar userId={u.uid} size={22} />
                        <span style={{ fontSize: 13 }}>{u.name}</span>
                      </PickerRow>
                    ))}
                  </Picker>
                )}
              </div>
            </div>

            {/* 마감일 */}
            <div className="prop-block">
              <div className="prop-label">마감일</div>
              <div className={`prop-val${due?.cls ? ` ${due.cls}` : ''}`} style={{ padding: '0 10px', gap: 6 }}>
                <i className="ti ti-calendar" style={{ flexShrink: 0 }} />
                <input
                  type="date"
                  value={task.due ?? ''}
                  onChange={e => handleDueChange(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', flex: 1, minWidth: 0 }}
                />
                {task.due && (
                  <button onClick={() => handleDueChange('')} title="마감일 삭제"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, lineHeight: 1 }}>
                    <i className="ti ti-x" style={{ fontSize: 12 }} />
                  </button>
                )}
              </div>
            </div>

            {/* 라벨 */}
            <div className="prop-block">
              <div className="prop-label">라벨</div>
              <div style={{ position: 'relative' }}>
                <div
                  className="prop-val"
                  style={{ flexWrap: 'wrap', gap: 4, height: 'auto', minHeight: 36, padding: '7px 10px', cursor: 'pointer' }}
                  onClick={() => { setShowLabelPicker(p => !p); setShowAssigneePicker(false); setShowColPicker(false); }}
                >
                  {task.labels.length > 0
                    ? task.labels.map(lid => {
                        const lm = currentBoard?.labels.find(l => l.id === lid);
                        if (!lm) return null;
                        return <span key={lid} className="label" style={{ background: lm.bg, color: lm.c }}>{lm.name}</span>;
                      })
                    : <span style={{ color: 'var(--text3)', fontSize: 12 }}>없음 — 클릭해서 추가</span>
                  }
                </div>
                {showLabelPicker && (
                  <Picker onClose={() => setShowLabelPicker(false)}>
                    {(currentBoard?.labels ?? []).length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>
                        라벨 없음
                      </div>
                    ) : (
                      (currentBoard?.labels ?? []).map(lm => (
                        <PickerRow key={lm.id} checked={task.labels.includes(lm.id)} onClick={() => handleLabelToggle(lm.id)}>
                          <span className="label" style={{ background: lm.bg, color: lm.c, fontSize: 11 }}>{lm.name}</span>
                        </PickerRow>
                      ))
                    )}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                    <button
                      onClick={() => { setShowLabelPicker(false); setShowLabelManager(true); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        width: '100%', padding: '7px 10px', border: 'none',
                        background: 'none', cursor: 'pointer', fontSize: 12,
                        color: 'var(--purple-text)', borderRadius: 7,
                      }}
                    >
                      <i className="ti ti-settings" style={{ fontSize: 13 }} />
                      라벨 관리
                    </button>
                  </Picker>
                )}
              </div>
            </div>

            {/* 컬럼 이동 */}
            <div className="prop-block">
              <div className="prop-label">컬럼</div>
              <div style={{ position: 'relative' }}>
                <div
                  className="prop-val"
                  onClick={() => { setShowColPicker(p => !p); setShowAssigneePicker(false); setShowLabelPicker(false); }}
                  style={{ cursor: 'pointer', gap: 6 }}
                >
                  <i className="ti ti-layout-columns" />
                  <span style={{ flex: 1 }}>{col?.name ?? '-'}</span>
                  <i className="ti ti-chevron-down" style={{ fontSize: 11, color: 'var(--text3)' }} />
                </div>
                {showColPicker && (
                  <Picker onClose={() => setShowColPicker(false)}>
                    {(currentBoard?.columns ?? []).map(c => (
                      <PickerRow
                        key={c.id}
                        checked={c.id === col?.id}
                        onClick={() => { moveTaskToColumn(task.id, c.id); setShowColPicker(false); }}
                      >
                        <span style={{ fontSize: 13 }}>{c.name}</span>
                      </PickerRow>
                    ))}
                  </Picker>
                )}
              </div>
            </div>
          </div>

          {/* ── 체크리스트 ── */}
          <div>
            <div className="sec-title">
              체크리스트{' '}
              <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({doneN}/{task.checklist.length})</span>
            </div>

            {task.checklist.length > 0 && (
              <>
                <div className="cl-bar-wrap">
                  <div className="cl-bar" style={{ width: `${pct}%` }} />
                </div>
                <div>
                  {task.checklist.map((item, i) => (
                    <div
                      key={i}
                      className="cl-item"
                      style={{ position: 'relative' }}
                      onMouseEnter={e => {
                        const btn = e.currentTarget.querySelector<HTMLButtonElement>('.cl-del-btn');
                        if (btn) btn.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        const btn = e.currentTarget.querySelector<HTMLButtonElement>('.cl-del-btn');
                        if (btn) btn.style.opacity = '0';
                      }}
                    >
                      <input
                        type="checkbox"
                        className="cl-cb"
                        checked={item.done}
                        onChange={e => toggleChecklist(task.id, i, e.target.checked)}
                      />
                      {editItemIdx === i ? (
                        <input
                          ref={editItemRef}
                          value={editItemVal}
                          onChange={e => setEditItemVal(e.target.value)}
                          onBlur={handleItemEditSave}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleItemEditSave(); }
                            if (e.key === 'Escape') setEditItemIdx(null);
                          }}
                          style={{
                            flex: 1, border: 'none', borderBottom: '1px solid var(--purple)',
                            outline: 'none', background: 'transparent', fontSize: 13,
                            fontFamily: 'inherit', color: 'var(--text)', padding: '1px 0',
                          }}
                        />
                      ) : (
                        <span
                          className={`cl-text${item.done ? ' done' : ''}`}
                          onDoubleClick={() => { setEditItemIdx(i); setEditItemVal(item.text); }}
                          title="더블클릭해서 수정"
                          style={{ flex: 1, cursor: 'text' }}
                        >
                          {item.text}
                        </span>
                      )}
                      <button
                        className="cl-del-btn"
                        onClick={() => deleteChecklistItem(task.id, i)}
                        title="삭제"
                        style={{
                          opacity: 0, transition: 'opacity .15s',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text3)', padding: '0 2px', lineHeight: 1, flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#D84040')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                      >
                        <i className="ti ti-x" style={{ fontSize: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {addingItem ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  ref={newItemRef}
                  value={newItemVal}
                  onChange={e => setNewItemVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); }
                    if (e.key === 'Escape') { setAddingItem(false); setNewItemVal(''); }
                  }}
                  placeholder="항목을 입력하세요..."
                  style={{
                    flex: 1, border: '1px solid var(--border2)', borderRadius: 8,
                    padding: '6px 10px', fontSize: 13, fontFamily: 'inherit',
                    background: 'var(--surface2)', color: 'var(--text)', outline: 'none',
                    boxShadow: '0 0 0 2px var(--purple)',
                  }}
                />
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={handleAddItem} disabled={!newItemVal.trim()}>추가</button>
                <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => { setAddingItem(false); setNewItemVal(''); }}>
                  <i className="ti ti-x" style={{ fontSize: 13 }} />
                </button>
              </div>
            ) : (
              <button className="btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setAddingItem(true)}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} />항목 추가
              </button>
            )}
          </div>

          {/* ── 댓글 ── */}
          <div>
            <div className="sec-title">
              댓글 <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({task.comments.length})</span>
            </div>
            {task.comments.length > 0 && (
              <div className="comment-wrap">
                {task.comments.map((c, i) => {
                  const u = orgUsers.find(u => u.uid === c.author);
                  const isEditingThis = editCommentIdx === i;
                  return (
                    <div
                      key={i}
                      className="comment"
                      onMouseEnter={e => {
                        e.currentTarget.querySelectorAll<HTMLButtonElement>('.cmt-act').forEach(b => (b.style.opacity = '1'));
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.querySelectorAll<HTMLButtonElement>('.cmt-act').forEach(b => (b.style.opacity = '0'));
                      }}
                    >
                      <Avatar userId={c.author} size={28} />
                      <div className="comment-body" style={{ flex: 1, minWidth: 0 }}>
                        <div className="comment-author" style={{ display: 'flex', alignItems: 'center' }}>
                          {u?.name
                            ?? (authUser?.uid === c.author
                              ? (authUser.displayName ?? authUser.email?.split('@')[0] ?? c.author)
                              : c.author)}
                          <span className="comment-time">{c.time}</span>
                          {!isEditingThis && (
                            <>
                              <button
                                className="cmt-act"
                                onClick={() => { setEditCommentIdx(i); setEditCommentVal(c.text); }}
                                title="수정"
                                style={{ marginLeft: 'auto', opacity: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0 3px', lineHeight: 1, transition: 'opacity .15s', flexShrink: 0 }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                              >
                                <i className="ti ti-pencil" style={{ fontSize: 12 }} />
                              </button>
                              <button
                                className="cmt-act"
                                onClick={() => deleteComment(task.id, i)}
                                title="삭제"
                                style={{ opacity: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0 3px', lineHeight: 1, transition: 'opacity .15s', flexShrink: 0 }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#D84040')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                              >
                                <i className="ti ti-trash" style={{ fontSize: 12 }} />
                              </button>
                            </>
                          )}
                        </div>
                        {isEditingThis ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                            <textarea
                              value={editCommentVal}
                              onChange={e => setEditCommentVal(e.target.value)}
                              rows={2}
                              autoFocus
                              style={{
                                width: '100%', borderRadius: 8,
                                border: '1px solid var(--purple)',
                                padding: '6px 10px', fontSize: 13,
                                fontFamily: 'inherit',
                                background: 'var(--surface2)', color: 'var(--text)',
                                outline: 'none', resize: 'none',
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleEditCommentSave(); }
                                if (e.key === 'Escape') setEditCommentIdx(null);
                              }}
                            />
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleEditCommentSave} disabled={!editCommentVal.trim()}>저장</button>
                              <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditCommentIdx(null)}>취소</button>
                            </div>
                          </div>
                        ) : (
                          <div className="comment-text">{renderTextWithLinks(c.text)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="comment-input-row" style={{ position: 'relative' }}>
              <Avatar userId={authUser?.uid ?? ''} size={28} />
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={commentRef}
                  className="comment-input"
                  placeholder="댓글을 입력하세요... (@이름으로 멘션, Ctrl+Enter로 전송)"
                  rows={2}
                  value={commentText}
                  onChange={handleCommentChange}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setMentionQuery(null);
                    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleCommentSave(); }
                  }}
                  style={{ width: '100%' }}
                />
                {mentionQuery !== null && (() => {
                  const q = mentionQuery.toLowerCase();
                  const filtered = orgUsers.filter(
                    u => u.uid !== authUser?.uid &&
                    u.name.replace(/\s/g, '').toLowerCase().startsWith(q)
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.13)',
                      minWidth: 180, zIndex: 700, padding: 4,
                    }}>
                      <div style={{ padding: '4px 10px 2px', fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        멘션
                      </div>
                      {filtered.map(u => (
                        <button
                          key={u.uid}
                          onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '6px 10px', border: 'none',
                            background: 'none', cursor: 'pointer', borderRadius: 7,
                            fontSize: 13, color: 'var(--text)', textAlign: 'left', fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Avatar userId={u.uid} size={22} />
                          <span>{u.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <button
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end' }}
                onClick={handleCommentSave}
                disabled={!commentText.trim() || commentSaving}
              >
                {commentSaving
                  ? <i className="ti ti-loader-2" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />
                  : <i className="ti ti-send" style={{ fontSize: 13 }} />
                }
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              @이름으로 팀원을 멘션할 수 있습니다
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          {/* ── 활동 로그 ── */}
          <div>
            <div
              className="sec-title"
              onClick={() => setShowLogs(p => !p)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
            >
              <span>활동</span>
              <span style={{ fontWeight: 400, color: 'var(--text3)' }}>
                ({(task.logs ?? []).length})
              </span>
              <i
                className={`ti ti-chevron-${showLogs ? 'up' : 'down'}`}
                style={{ fontSize: 11, marginLeft: 'auto' }}
              />
            </div>
            {showLogs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(task.logs ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '2px 0' }}>
                    아직 활동이 없습니다
                  </div>
                ) : (
                  [...(task.logs ?? [])].reverse().map((log, i) => (
                    <ActivityLogItem key={i} log={log} board={currentBoard} orgUsers={orgUsers} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── 공통 Picker ───────────────────────────────────────────────────

function Picker({ children, onClose, align = 'left' }: {
  children: React.ReactNode; onClose: () => void; align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 4px)',
      ...(align === 'right' ? { right: 0 } : { left: 0 }),
      zIndex: 600,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.13)',
      minWidth: 200, maxHeight: 240, overflowY: 'auto', padding: 4,
    }}>
      {children}
    </div>
  );
}

// ── 활동 로그 항목 ────────────────────────────────────────────────

function ActivityLogItem({
  log, board, orgUsers,
}: {
  log: ActivityLog;
  board: FirestoreBoard | null;
  orgUsers: UserProfile[];
}) {
  const actor = orgUsers.find(u => u.uid === log.actor);
  const actorName = actor?.name ?? '알 수 없음';

  let icon = 'ti-circle-dot';
  let text = '';

  switch (log.type) {
    case 'created':
      icon = 'ti-plus'; text = `${actorName}님이 카드를 생성했습니다`; break;
    case 'assignee_added': {
      icon = 'ti-user-plus';
      const u = orgUsers.find(u => u.uid === log.payload?.uid);
      text = `${actorName}님이 ${u?.name ?? '누군가'}를 담당자로 추가했습니다`; break;
    }
    case 'assignee_removed': {
      icon = 'ti-user-minus';
      const u = orgUsers.find(u => u.uid === log.payload?.uid);
      text = `${actorName}님이 ${u?.name ?? '누군가'}를 담당자에서 제거했습니다`; break;
    }
    case 'column_moved': {
      icon = 'ti-arrows-right-left';
      const from = board?.columns.find(c => c.id === log.payload?.fromColId)?.name ?? '?';
      const to   = board?.columns.find(c => c.id === log.payload?.toColId)?.name   ?? '?';
      text = `${actorName}님이 [${from}] → [${to}]로 이동했습니다`; break;
    }
    case 'due_changed':
      icon = 'ti-calendar';
      text = log.payload?.due
        ? `${actorName}님이 마감일을 ${log.payload.due}로 설정했습니다`
        : `${actorName}님이 마감일을 제거했습니다`; break;
    case 'comment_added':
      icon = 'ti-message-circle'; text = `${actorName}님이 댓글을 추가했습니다`; break;
    case 'archived':
      icon = 'ti-archive'; text = `${actorName}님이 카드를 아카이브했습니다`; break;
    case 'restored':
      icon = 'ti-rotate-clockwise'; text = `${actorName}님이 카드를 복원했습니다`; break;
  }

  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: 'var(--text3)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{log.time}</div>
      </div>
    </div>
  );
}

function PickerRow({ checked, onClick, children }: {
  checked: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 10px', border: 'none', borderRadius: 7,
        cursor: 'pointer', background: checked ? 'var(--purple-light)' : 'none',
        transition: 'background .1s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'none'; }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${checked ? 'var(--purple)' : 'var(--border2)'}`,
        background: checked ? 'var(--purple)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <i className="ti ti-check" style={{ fontSize: 10, color: '#fff' }} />}
      </div>
      {children}
    </button>
  );
}
