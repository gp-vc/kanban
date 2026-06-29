'use client';

import { Draggable } from '@hello-pangea/dnd';
import { useKanban } from '../context/KanbanContext';
import { fmtDate } from '../lib/utils';
import Avatar from './Avatar';
import type { Task, Priority } from '../lib/types';

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: '긴급', high: '높음', medium: '보통', low: '낮음',
};
const PRIORITY_STYLE: Record<Priority, React.CSSProperties> = {
  urgent: { background: 'rgba(239,68,68,0.15)',  color: '#EF4444' },
  high:   { background: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  medium: { background: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
  low:    { background: 'rgba(100,116,139,0.15)',color: '#94A3B8' },
};

interface Props {
  task: Task;
  index: number;
  locked?: boolean;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(107,95,237,0.22)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function Card({ task, index, locked }: Props) {
  const { openModal, currentBoard, searchQuery } = useKanban();
  const due = fmtDate(task.due);
  const doneN = task.checklist.filter(c => c.done).length;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!!searchQuery || !!locked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' dragging' : ''}`}
          onClick={() => openModal(task.id)}
        >
          {task.labels.length > 0 && (
            <div className="card-labels">
              {task.labels.map(lid => {
                const lm = currentBoard?.labels.find(l => l.id === lid);
                if (!lm) return null;
                return (
                  <span key={lid} className="label" style={{ background: lm.bg, color: lm.c }}>
                    {lm.name}
                  </span>
                );
              })}
            </div>
          )}
          {task.priority && (
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 7px', borderRadius: 4,
              fontSize: 10, fontWeight: 700, marginBottom: 3,
              letterSpacing: '.03em',
              ...PRIORITY_STYLE[task.priority],
            }}>
              {PRIORITY_LABEL[task.priority]}
            </div>
          )}
          <div className="card-title"><Highlight text={task.title} query={searchQuery} /></div>
          <div className="card-footer">
            <div className="card-left">
              {due && (
                <div className={`card-due${due.cls ? ` ${due.cls}` : ''}`}>
                  <i className="ti ti-calendar" />
                  {due.str}
                </div>
              )}
              {task.checklist.length > 0 && (
                <div className="card-meta">
                  <i className="ti ti-checkbox" />
                  {doneN}/{task.checklist.length}
                </div>
              )}
              {task.comments.length > 0 && (
                <div className="card-meta">
                  <i className="ti ti-message-circle" />
                  {task.comments.length}
                </div>
              )}
            </div>
            <div className="card-avatars">
              {task.assignees.map(uid => (
                <Avatar key={uid} userId={uid} size={22} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
