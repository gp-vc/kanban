'use client';

import {
  createContext, useContext, useState, useCallback,
  useEffect, useMemo, useRef, ReactNode,
} from 'react';
import {
  subscribeToBoardsList,
  subscribeToBoardTasks,
  moveTask         as firestoreMoveTask,
  updateChecklist,
  updateTaskFields,
  addComment       as firestoreAddComment,
  createTask       as firestoreCreateTask,
  createBoard      as firestoreCreateBoard,
  reorderColumns   as firestoreReorderColumns,
  addColumn        as firestoreAddColumn,
  renameColumn     as firestoreRenameColumn,
  deleteColumn     as firestoreDeleteColumn,
  updateBoardLabels,
  deleteTask       as firestoreDeleteTask,
  deleteBoard      as firestoreDeleteBoard,
  moveTaskToColumn as firestoreMoveTaskToColumn,
  updateBoard      as firestoreUpdateBoard,
  updateBoardMembers as firestoreUpdateBoardMembers,
  updateBoardBackground as firestoreUpdateBoardBackground,
  updateTaskComments,
  subscribeToUsers,
  copyTask              as firestoreCopyTask,
  archiveTask           as firestoreArchiveTask,
  restoreTask           as firestoreRestoreTask,
  appendActivityLog     as firestoreAppendLog,
  createMentionNotification as firestoreCreateMentionNotification,
  subscribeToNotifications  as firestoreSubscribeToNotifications,
  markNotificationRead      as firestoreMarkNotifRead,
  markAllNotificationsRead  as firestoreMarkAllNotifsRead,
  deleteNotification        as firestoreDeleteNotif,
  deleteAllReadNotifications as firestoreDeleteAllReadNotifs,
} from '../lib/firestore';
import { useAuth } from './AuthContext';
import type { Task, ColumnState, FirestoreBoard, FirestoreColumn, CheckItem, Comment, BoardLabel, UserProfile, ActivityLog, AppNotification, CardFilter } from '../lib/types';

function fmtNow(): string {
  return new Date().toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Context 인터페이스 ──────────────────────────────────────────

interface KanbanCtx {
  // 데이터
  boards:       FirestoreBoard[];
  currentBoard: FirestoreBoard | null;
  colState:     Record<string, ColumnState>;
  tasks:        Record<string, Task>;
  orgUsers:     UserProfile[];
  // 로딩 상태
  boardsLoading: boolean;
  tasksLoading:  boolean;
  // UI 상태
  sbOpen:       boolean;
  mobileSbOpen: boolean;
  modalTaskId:  string | null;
  // 액션
  selectBoard:        (id: string) => void;
  toggleSidebar:      () => void;
  closeMobileSidebar: () => void;
  moveTask:           (taskId: string, srcColId: string, dstColId: string, dstIndex: number) => void;
  toggleChecklist:    (taskId: string, idx: number, val: boolean) => void;
  addTask:            (columnId: string, title: string) => Promise<void>;
  updateTask:         (taskId: string, updates: Partial<Pick<Task, 'title' | 'desc' | 'labels' | 'assignees' | 'due' | 'priority'>>) => Promise<void>;
  addChecklistItem:    (taskId: string, text: string) => Promise<void>;
  deleteChecklistItem: (taskId: string, index: number) => Promise<void>;
  updateChecklistItem: (taskId: string, index: number, newText: string) => Promise<void>;
  saveComment:         (taskId: string, text: string) => Promise<void>;
  addBoardLabel:       (name: string, bg: string, c: string) => Promise<void>;
  updateBoardLabel:    (labelId: string, name: string, bg: string, c: string) => Promise<void>;
  deleteBoardLabel:    (labelId: string) => Promise<void>;
  reorderColumns:     (srcIndex: number, dstIndex: number) => void;
  addColumn:          (name: string, color: string) => Promise<void>;
  renameColumn:       (columnId: string, newName: string) => Promise<void>;
  deleteColumn:       (columnId: string) => Promise<void>;
  createBoard:        (name: string, type: 'private' | 'shared' | 'team', color: string, initialMemberIds?: string[]) => Promise<void>;
  updateBoardMembers: (boardId: string, memberIds: string[], type: 'private' | 'shared' | 'team') => Promise<void>;
  deleteTask:         (taskId: string) => Promise<void>;
  deleteBoard:        (boardId: string) => Promise<void>;
  moveTaskToColumn:   (taskId: string, targetColId: string) => void;
  updateBoard:        (boardId: string, updates: { name?: string; color?: string }) => Promise<void>;
  editComment:        (taskId: string, index: number, newText: string) => Promise<void>;
  deleteComment:      (taskId: string, index: number) => Promise<void>;
  openModal:          (taskId: string) => void;
  closeModal:         () => void;
  getColOfTask:       (tid: string) => ColumnState | null;
  searchQuery:        string;
  setSearchQuery:     (q: string) => void;
  cardFilter:         CardFilter;
  setCardFilter:      (f: CardFilter) => void;
  activeFilterCount:  number;
  clearFilter:        () => void;
  copyTask:           (taskId: string, targetColumnId: string) => Promise<void>;
  archivedTasks:      Task[];
  showArchive:        boolean;
  toggleArchive:      () => void;
  archiveTask:        (taskId: string) => Promise<void>;
  restoreTask:        (taskId: string) => Promise<void>;
  boardLocked:        boolean;
  toggleBoardLock:    () => void;
  updateBoardBackground:    (boardId: string, bg: string) => Promise<void>;
  notifications:            AppNotification[];
  unreadCount:              number;
  markNotificationRead:     (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification:       (notifId: string) => Promise<void>;
  deleteAllReadNotifications: () => Promise<void>;
}

const KanbanContext = createContext<KanbanCtx | null>(null);

// ── 헬퍼: Firestore 컬럼 → UI ColumnState 변환 ─────────────────

function toColState(columns: FirestoreColumn[]): Record<string, ColumnState> {
  return Object.fromEntries(
    columns.map(col => [
      col.id,
      { id: col.id, name: col.name, color: col.color, tasks: col.taskIds },
    ])
  );
}

// ═══════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════

export function KanbanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user!.uid; // KanbanProvider는 인증된 상태에서만 렌더됨

  const [boards,       setBoards]       = useState<FirestoreBoard[]>([]);
  const [orgUsers,     setOrgUsers]     = useState<UserProfile[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [tasks,        setTasks]        = useState<Record<string, Task>>({});
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [tasksLoading,  setTasksLoading]  = useState(false);
  const [sbOpen,       setSbOpen]       = useState(true);
  const [mobileSbOpen, setMobileSbOpen] = useState(false);
  const [modalTaskId,  setModalTaskId]  = useState<string | null>(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showArchive,    setShowArchive]    = useState(false);
  const [boardLocked,    setBoardLocked]    = useState(false);
  const [notifications,  setNotifications]  = useState<AppNotification[]>([]);
  const [cardFilter,   setCardFilter]   = useState<CardFilter>({ assignees: [], priorities: [], labelIds: [] });

  // 최초 자동 선택이 됐는지 추적
  const autoSelectedRef = useRef(false);

  // ── 보드 목록 실시간 구독 ────────────────────────────────────
  useEffect(() => {
    setBoardsLoading(true);
    const unsub = subscribeToBoardsList(
      userId,
      (fetched) => {
        setBoards(fetched);
        setBoardsLoading(false);
        // 첫 로드 시 첫 번째 보드 자동 선택
        if (!autoSelectedRef.current && fetched.length > 0) {
          autoSelectedRef.current = true;
          setCurrentBoardId(fetched[0].id);
        }
      },
      () => setBoardsLoading(false)
    );
    return unsub;
  }, []); // 마운트 1회

  // ── gp-vc.com 구성원 목록 실시간 구독 ───────────────────────
  useEffect(() => {
    const unsub = subscribeToUsers(setOrgUsers);
    return unsub;
  }, []);

  // ── 알림 실시간 구독 ─────────────────────────────────────────
  useEffect(() => {
    const unsub = firestoreSubscribeToNotifications(userId, setNotifications);
    return unsub;
  }, [userId]);

  // ── 현재 보드의 task 실시간 구독 ────────────────────────────
  useEffect(() => {
    if (!currentBoardId) {
      setTasks({});
      return;
    }
    setTasksLoading(true);
    const unsub = subscribeToBoardTasks(
      currentBoardId,
      (fetched) => {
        setTasks(fetched);
        setTasksLoading(false);
      },
      () => setTasksLoading(false)
    );
    return unsub;
  }, [currentBoardId]);

  // ── 파생 상태 ────────────────────────────────────────────────

  const currentBoard = useMemo(
    () => boards.find(b => b.id === currentBoardId) ?? null,
    [boards, currentBoardId]
  );

  // colState는 currentBoard의 columns에서 파생 (별도 state 불필요)
  const colState = useMemo(
    () => (currentBoard ? toColState(currentBoard.columns) : {}),
    [currentBoard]
  );

  // 현재 보드의 아카이브된 카드 목록
  const archivedTasks = useMemo(
    () => Object.values(tasks).filter(t => t.archived === true),
    [tasks]
  );

  // ── 액션 ─────────────────────────────────────────────────────

  const selectBoard = useCallback((id: string) => {
    setCurrentBoardId(id);
    setSearchQuery('');
    setBoardLocked(false);
    setCardFilter({ assignees: [], priorities: [], labelIds: [] });
  }, []);

  const activeFilterCount = useMemo(
    () => cardFilter.assignees.length + cardFilter.priorities.length + cardFilter.labelIds.length,
    [cardFilter]
  );

  const clearFilter = useCallback(
    () => setCardFilter({ assignees: [], priorities: [], labelIds: [] }),
    []
  );

  const toggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      setMobileSbOpen(prev => !prev);
    } else {
      setSbOpen(prev => !prev);
    }
  }, []);

  const closeMobileSidebar = useCallback(() => setMobileSbOpen(false), []);

  /**
   * 드래그 종료 처리:
   * 1. Optimistic update — 즉시 로컬 상태 반영 (UI 즉각 반응)
   * 2. Firestore batch write — DB 동기화
   * onSnapshot이 완료되면 DB 값으로 최종 확정됨.
   */
  const handleMoveTask = useCallback((
    taskId: string,
    srcColId: string,
    dstColId: string,
    dstIndex: number
  ) => {
    if (!currentBoard) return;

    // Firestore 호출 전 원본 columns 캡처 (클로저 안전)
    const originalColumns = currentBoard.columns;

    // ① Optimistic update: boards 상태를 즉시 변경
    const newColumns = originalColumns.map(col => {
      if (col.id === srcColId && col.id === dstColId) {
        const ids = col.taskIds.filter(id => id !== taskId);
        ids.splice(dstIndex, 0, taskId);
        return { ...col, taskIds: ids };
      }
      if (col.id === srcColId) return { ...col, taskIds: col.taskIds.filter(id => id !== taskId) };
      if (col.id === dstColId) {
        const ids = col.taskIds.filter(id => id !== taskId);
        ids.splice(dstIndex, 0, taskId);
        return { ...col, taskIds: ids };
      }
      return col;
    });

    setBoards(prev =>
      prev.map(b => b.id === currentBoard.id ? { ...b, columns: newColumns } : b)
    );

    // ② Firestore 쓰기 (실패 시 onSnapshot이 DB 값으로 자동 복원)
    firestoreMoveTask(
      currentBoard.id, originalColumns, taskId, srcColId, dstColId, dstIndex
    ).catch(err => console.error('[Firestore] moveTask failed:', err));
  }, [currentBoard]);

  /**
   * 체크리스트 토글:
   * 1. Optimistic update — tasks 상태를 즉시 변경 (진행 바 즉각 반응)
   * 2. Firestore 업데이트
   * 실패 시 이전 상태로 롤백.
   */
  const handleToggleChecklist = useCallback((
    taskId: string,
    idx: number,
    val: boolean
  ) => {
    const task = tasks[taskId];
    if (!task) return;

    const newChecklist: CheckItem[] = task.checklist.map((item, i) =>
      i === idx ? { ...item, done: val } : item
    );

    // ① Optimistic update
    setTasks(prev => ({
      ...prev,
      [taskId]: { ...task, checklist: newChecklist },
    }));

    // ② Firestore 쓰기
    updateChecklist(taskId, newChecklist).catch(err => {
      console.error('[Firestore] updateChecklist failed:', err);
      // 롤백
      setTasks(prev => ({ ...prev, [taskId]: task }));
    });
  }, [tasks]);

  /**
   * 새 카드 생성:
   * - Firestore createTask() 호출 → board.columns[].taskIds에 append
   * - onSnapshot이 발화하면 colState와 tasks가 자동으로 업데이트됨
   * - 새 카드는 Firestore 서버 ID로 생성되므로 optimistic update 생략
   */
  const addTask = useCallback(async (columnId: string, title: string) => {
    if (!currentBoard || !title.trim()) return;
    const taskId = await firestoreCreateTask(
      currentBoard.id,
      columnId,
      { title: title.trim(), desc: '', labels: [], assignees: [], due: undefined },
      currentBoard.columns
    );
    firestoreAppendLog(taskId, { type: 'created', actor: userId, time: fmtNow() })
      .catch(console.error);
  }, [currentBoard, userId]);

  const handleUpdateTask = useCallback(async (
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'desc' | 'labels' | 'assignees' | 'due' | 'priority'>>
  ) => {
    const task = tasks[taskId];
    if (!task) return;
    setTasks(prev => ({ ...prev, [taskId]: { ...task, ...updates } }));
    try {
      await updateTaskFields(taskId, updates);
      // 담당자 변경 로그 + 알림
      if (updates.assignees) {
        const added   = updates.assignees.filter(a => !task.assignees.includes(a));
        const removed = task.assignees.filter(a => !updates.assignees!.includes(a));
        const logs: ActivityLog[] = [
          ...added.map(uid   => ({ type: 'assignee_added'   as const, actor: userId, time: fmtNow(), payload: { uid } })),
          ...removed.map(uid => ({ type: 'assignee_removed' as const, actor: userId, time: fmtNow(), payload: { uid } })),
        ];
        logs.forEach(log => firestoreAppendLog(taskId, log).catch(console.error));
        // 나 이외의 새 담당자에게 알림 전송
        if (currentBoard) {
          const fromName = orgUsers.find(u => u.uid === userId)?.name ?? '';
          added
            .filter(uid => uid !== userId)
            .forEach(uid => {
              firestoreCreateMentionNotification(uid, {
                type: 'assigned',
                boardId: currentBoard.id,
                boardName: currentBoard.name,
                taskId,
                taskTitle: task.title,
                fromUid: userId,
                fromName,
                commentText: '',
                read: false,
                createdAt: fmtNow(),
                ts: Date.now(),
              }).catch(console.error);
            });
        }
      }
      // 마감일 변경 로그
      if ('due' in updates && updates.due !== task.due) {
        firestoreAppendLog(taskId, {
          type: 'due_changed', actor: userId, time: fmtNow(),
          payload: { due: updates.due ?? '' },
        }).catch(console.error);
      }
    } catch (err) {
      console.error('[Firestore] updateTask failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks, userId]);

  const handleAddChecklistItem = useCallback(async (taskId: string, text: string) => {
    const task = tasks[taskId];
    if (!task || !text.trim()) return;
    const newChecklist: CheckItem[] = [...task.checklist, { text: text.trim(), done: false }];
    setTasks(prev => ({ ...prev, [taskId]: { ...task, checklist: newChecklist } }));
    try {
      await updateChecklist(taskId, newChecklist);
    } catch (err) {
      console.error('[Firestore] addChecklistItem failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks]);

  const handleSaveComment = useCallback(async (taskId: string, text: string) => {
    const task = tasks[taskId];
    if (!task || !text.trim()) return;
    const comment: Comment = {
      author: userId,
      text: text.trim(),
      time: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    const newComments: Comment[] = [...task.comments, comment];
    setTasks(prev => ({ ...prev, [taskId]: { ...task, comments: newComments } }));
    try {
      await firestoreAddComment(taskId, comment);
      firestoreAppendLog(taskId, { type: 'comment_added', actor: userId, time: fmtNow() })
        .catch(console.error);
      // @멘션 파싱 및 알림 생성
      if (currentBoard) {
        const fromName = orgUsers.find(u => u.uid === userId)?.name ?? '';
        const mentionRegex = /@([\w가-힣]+)/g;
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          const mentionedName = match[1];
          const mentioned = orgUsers.find(
            u => u.name.replace(/\s/g, '') === mentionedName.replace(/\s/g, '') && u.uid !== userId
          );
          if (mentioned) {
            firestoreCreateMentionNotification(mentioned.uid, {
              type: 'mention',
              boardId: currentBoard.id,
              boardName: currentBoard.name,
              taskId,
              taskTitle: task.title,
              fromUid: userId,
              fromName,
              commentText: text.trim(),
              read: false,
              createdAt: fmtNow(),
              ts: Date.now(),
            }).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.error('[Firestore] saveComment failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks, userId, currentBoard, orgUsers]);

  const handleDeleteChecklistItem = useCallback(async (taskId: string, index: number) => {
    const task = tasks[taskId];
    if (!task) return;
    const newChecklist: CheckItem[] = task.checklist.filter((_, i) => i !== index);
    setTasks(prev => ({ ...prev, [taskId]: { ...task, checklist: newChecklist } }));
    try {
      await updateChecklist(taskId, newChecklist);
    } catch (err) {
      console.error('[Firestore] deleteChecklistItem failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks]);

  const handleUpdateChecklistItem = useCallback(async (taskId: string, index: number, newText: string) => {
    const task = tasks[taskId];
    if (!task || !newText.trim()) return;
    const newChecklist: CheckItem[] = task.checklist.map((item, i) =>
      i === index ? { ...item, text: newText.trim() } : item
    );
    setTasks(prev => ({ ...prev, [taskId]: { ...task, checklist: newChecklist } }));
    try {
      await updateChecklist(taskId, newChecklist);
    } catch (err) {
      console.error('[Firestore] updateChecklistItem failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks]);

  const handleAddBoardLabel = useCallback(async (name: string, bg: string, c: string) => {
    if (!currentBoard) return;
    const newLabel: BoardLabel = { id: crypto.randomUUID(), name, bg, c };
    const newLabels = [...currentBoard.labels, newLabel];
    setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, labels: newLabels } : b));
    try {
      await updateBoardLabels(currentBoard.id, newLabels);
    } catch (err) {
      console.error('[Firestore] addBoardLabel failed:', err);
      setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, labels: currentBoard.labels } : b));
    }
  }, [currentBoard]);

  const handleUpdateBoardLabel = useCallback(async (labelId: string, name: string, bg: string, c: string) => {
    if (!currentBoard) return;
    const newLabels = currentBoard.labels.map(l =>
      l.id === labelId ? { ...l, name, bg, c } : l
    );
    setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, labels: newLabels } : b));
    try {
      await updateBoardLabels(currentBoard.id, newLabels);
    } catch (err) {
      console.error('[Firestore] updateBoardLabel failed:', err);
      setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, labels: currentBoard.labels } : b));
    }
  }, [currentBoard]);

  const handleDeleteBoardLabel = useCallback(async (labelId: string) => {
    if (!currentBoard) return;
    const newLabels = currentBoard.labels.filter(l => l.id !== labelId);
    setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, labels: newLabels } : b));
    try {
      await updateBoardLabels(currentBoard.id, newLabels);
    } catch (err) {
      console.error('[Firestore] deleteBoardLabel failed:', err);
      setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, labels: currentBoard.labels } : b));
    }
  }, [currentBoard]);

  const handleReorderColumns = useCallback((srcIndex: number, dstIndex: number) => {
    if (!currentBoard) return;
    const originalColumns = currentBoard.columns;
    const newColumns = [...originalColumns];
    const [moved] = newColumns.splice(srcIndex, 1);
    newColumns.splice(dstIndex, 0, moved);
    // Optimistic update
    setBoards(prev =>
      prev.map(b => b.id === currentBoard.id ? { ...b, columns: newColumns } : b)
    );
    firestoreReorderColumns(currentBoard.id, originalColumns, srcIndex, dstIndex)
      .catch(err => console.error('[Firestore] reorderColumns failed:', err));
  }, [currentBoard]);

  const handleAddColumn = useCallback(async (name: string, color: string) => {
    if (!currentBoard || !name.trim()) return;
    await firestoreAddColumn(currentBoard.id, currentBoard.columns, {
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
    });
  }, [currentBoard]);

  const handleRenameColumn = useCallback(async (columnId: string, newName: string) => {
    if (!currentBoard || !newName.trim()) return;
    await firestoreRenameColumn(currentBoard.id, currentBoard.columns, columnId, newName.trim());
  }, [currentBoard]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    if (!currentBoard) return;
    await firestoreDeleteColumn(currentBoard.id, currentBoard.columns, columnId);
  }, [currentBoard]);

  const handleCreateBoard = useCallback(async (
    name: string,
    type: 'private' | 'shared' | 'team',
    color: string,
    initialMemberIds?: string[]
  ) => {
    const newId = await firestoreCreateBoard(userId, {
      name, type, color, initialMemberIds,
      columns: [
        { id: crypto.randomUUID(), name: '할 일',   color: 'purple' },
        { id: crypto.randomUUID(), name: '진행 중', color: 'blue'   },
        { id: crypto.randomUUID(), name: '검토 중', color: 'amber'  },
        { id: crypto.randomUUID(), name: '완료',    color: 'green'  },
      ],
    });
    // 생성된 보드 자동 선택 (onSnapshot이 boards 업데이트 전에 미리 선택)
    setCurrentBoardId(newId);
    autoSelectedRef.current = true;
  }, [userId]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!currentBoard) return;
    const originalColumns = currentBoard.columns;
    setTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    setBoards(prev => prev.map(b =>
      b.id !== currentBoard.id ? b : {
        ...b,
        columns: b.columns.map(col => ({
          ...col,
          taskIds: col.taskIds.filter(id => id !== taskId),
        })),
      }
    ));
    try {
      await firestoreDeleteTask(currentBoard.id, taskId, originalColumns);
    } catch (err) {
      console.error('[Firestore] deleteTask failed:', err);
    }
  }, [currentBoard]);

  const handleDeleteBoard = useCallback(async (boardId: string) => {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    setModalTaskId(null);
    setBoards(prev => prev.filter(b => b.id !== boardId));
    if (currentBoardId === boardId) {
      const remaining = boards.filter(b => b.id !== boardId);
      setCurrentBoardId(remaining.length > 0 ? remaining[0].id : null);
    }
    try {
      await firestoreDeleteBoard(boardId, board.columns);
    } catch (err) {
      console.error('[Firestore] deleteBoard failed:', err);
    }
  }, [boards, currentBoardId]);

  const handleMoveTaskToColumn = useCallback((taskId: string, targetColId: string) => {
    if (!currentBoard) return;
    const srcCol = currentBoard.columns.find(col => col.taskIds.includes(taskId));
    if (!srcCol || srcCol.id === targetColId) return;
    const originalColumns = currentBoard.columns;
    const newColumns = originalColumns.map(col => {
      if (col.id === srcCol.id) return { ...col, taskIds: col.taskIds.filter(id => id !== taskId) };
      if (col.id === targetColId) return { ...col, taskIds: [...col.taskIds, taskId] };
      return col;
    });
    setBoards(prev => prev.map(b =>
      b.id === currentBoard.id ? { ...b, columns: newColumns } : b
    ));
    firestoreMoveTaskToColumn(currentBoard.id, originalColumns, taskId, srcCol.id, targetColId)
      .catch(err => console.error('[Firestore] moveTaskToColumn failed:', err));
    firestoreAppendLog(taskId, {
      type: 'column_moved', actor: userId, time: fmtNow(),
      payload: { fromColId: srcCol.id, toColId: targetColId },
    }).catch(console.error);
  }, [currentBoard, userId]);

  const handleUpdateBoard = useCallback(async (boardId: string, updates: { name?: string; color?: string }) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
    try {
      await firestoreUpdateBoard(boardId, updates);
    } catch (err) {
      console.error('[Firestore] updateBoard failed:', err);
    }
  }, []);

  const handleUpdateBoardMembers = useCallback(async (
    boardId: string,
    memberIds: string[],
    type: 'private' | 'shared' | 'team'
  ) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, memberIds, type } : b));
    try {
      await firestoreUpdateBoardMembers(boardId, memberIds, type);
    } catch (err) {
      console.error('[Firestore] updateBoardMembers failed:', err);
    }
  }, []);

  const handleEditComment = useCallback(async (taskId: string, index: number, newText: string) => {
    const task = tasks[taskId];
    if (!task || !newText.trim()) return;
    const newComments = task.comments.map((c, i) =>
      i === index ? { ...c, text: newText.trim() } : c
    );
    setTasks(prev => ({ ...prev, [taskId]: { ...task, comments: newComments } }));
    try {
      await updateTaskComments(taskId, newComments);
    } catch (err) {
      console.error('[Firestore] editComment failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks]);

  const handleDeleteComment = useCallback(async (taskId: string, index: number) => {
    const task = tasks[taskId];
    if (!task) return;
    const newComments = task.comments.filter((_, i) => i !== index);
    setTasks(prev => ({ ...prev, [taskId]: { ...task, comments: newComments } }));
    try {
      await updateTaskComments(taskId, newComments);
    } catch (err) {
      console.error('[Firestore] deleteComment failed:', err);
      setTasks(prev => ({ ...prev, [taskId]: task }));
    }
  }, [tasks]);

  const toggleArchive    = useCallback(() => setShowArchive(p => !p), []);
  const toggleBoardLock  = useCallback(() => setBoardLocked(p => !p), []);

  const handleUpdateBoardBackground = useCallback(async (boardId: string, bg: string) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, bg } : b));
    try {
      await firestoreUpdateBoardBackground(boardId, bg);
    } catch (err) {
      console.error('[Firestore] updateBoardBackground failed:', err);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const handleMarkNotifRead = useCallback(async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    try {
      await firestoreMarkNotifRead(userId, notifId);
    } catch (err) {
      console.error('[Firestore] markNotificationRead failed:', err);
    }
  }, [userId]);

  const handleMarkAllNotifsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await firestoreMarkAllNotifsRead(userId, unreadIds);
    } catch (err) {
      console.error('[Firestore] markAllNotificationsRead failed:', err);
    }
  }, [notifications, userId]);

  const handleDeleteNotification = useCallback(async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    try {
      await firestoreDeleteNotif(userId, notifId);
    } catch (err) {
      console.error('[Firestore] deleteNotification failed:', err);
    }
  }, [userId]);

  const handleDeleteAllReadNotifications = useCallback(async () => {
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    setNotifications(prev => prev.filter(n => !n.read));
    try {
      await firestoreDeleteAllReadNotifs(userId, readIds);
    } catch (err) {
      console.error('[Firestore] deleteAllReadNotifications failed:', err);
    }
  }, [notifications, userId]);

  const handleArchiveTask = useCallback(async (taskId: string) => {
    if (!currentBoard) return;
    const originalColumns = currentBoard.columns;
    // Optimistic: 컬럼에서 제거 + archived 표시
    setBoards(prev => prev.map(b =>
      b.id !== currentBoard.id ? b : {
        ...b,
        columns: b.columns.map(col => ({
          ...col, taskIds: col.taskIds.filter(id => id !== taskId),
        })),
      }
    ));
    setTasks(prev => ({ ...prev, [taskId]: { ...prev[taskId], archived: true } }));
    try {
      await firestoreArchiveTask(currentBoard.id, taskId, originalColumns);
      firestoreAppendLog(taskId, { type: 'archived', actor: userId, time: fmtNow() })
        .catch(console.error);
    } catch (err) {
      console.error('[Firestore] archiveTask failed:', err);
    }
  }, [currentBoard, userId]);

  const handleRestoreTask = useCallback(async (taskId: string) => {
    if (!currentBoard) return;
    const task = tasks[taskId];
    if (!task) return;
    const targetColId = task.columnId ?? currentBoard.columns[0]?.id ?? '';
    if (!targetColId) return;
    const originalColumns = currentBoard.columns;
    // Optimistic: 아카이브 해제 + 컬럼 말미에 추가
    setTasks(prev => ({ ...prev, [taskId]: { ...prev[taskId], archived: false } }));
    setBoards(prev => prev.map(b =>
      b.id !== currentBoard.id ? b : {
        ...b,
        columns: b.columns.map(col =>
          col.id === targetColId
            ? { ...col, taskIds: [...col.taskIds, taskId] }
            : col
        ),
      }
    ));
    try {
      await firestoreRestoreTask(currentBoard.id, taskId, targetColId, originalColumns);
      firestoreAppendLog(taskId, { type: 'restored', actor: userId, time: fmtNow() })
        .catch(console.error);
    } catch (err) {
      console.error('[Firestore] restoreTask failed:', err);
    }
  }, [currentBoard, tasks, userId]);

  const handleCopyTask = useCallback(async (taskId: string, targetColumnId: string) => {
    if (!currentBoard) return;
    const task = tasks[taskId];
    if (!task) return;
    await firestoreCopyTask(currentBoard.id, targetColumnId, task, currentBoard.columns);
  }, [currentBoard, tasks]);

  const openModal  = useCallback((id: string) => setModalTaskId(id), []);
  const closeModal = useCallback(() => setModalTaskId(null), []);

  const getColOfTask = useCallback((tid: string): ColumnState | null => {
    if (!currentBoard) return null;
    for (const col of currentBoard.columns) {
      if (col.taskIds.includes(tid)) {
        return { id: col.id, name: col.name, color: col.color, tasks: col.taskIds };
      }
    }
    return null;
  }, [currentBoard]);

  return (
    <KanbanContext.Provider value={{
      boards, currentBoard, colState, tasks, orgUsers,
      boardsLoading, tasksLoading,
      sbOpen, mobileSbOpen, modalTaskId,
      selectBoard, toggleSidebar, closeMobileSidebar,
      moveTask:        handleMoveTask,
      toggleChecklist: handleToggleChecklist,
      addTask,
      updateTask:          handleUpdateTask,
      addChecklistItem:    handleAddChecklistItem,
      deleteChecklistItem: handleDeleteChecklistItem,
      updateChecklistItem: handleUpdateChecklistItem,
      saveComment:         handleSaveComment,
      addBoardLabel:       handleAddBoardLabel,
      updateBoardLabel:    handleUpdateBoardLabel,
      deleteBoardLabel:    handleDeleteBoardLabel,
      reorderColumns: handleReorderColumns,
      addColumn:      handleAddColumn,
      renameColumn: handleRenameColumn,
      deleteColumn: handleDeleteColumn,
      createBoard: handleCreateBoard,
      deleteTask:       handleDeleteTask,
      deleteBoard:      handleDeleteBoard,
      moveTaskToColumn: handleMoveTaskToColumn,
      updateBoard:        handleUpdateBoard,
      updateBoardMembers: handleUpdateBoardMembers,
      editComment:      handleEditComment,
      deleteComment:    handleDeleteComment,
      openModal, closeModal, getColOfTask,
      searchQuery, setSearchQuery,
      cardFilter, setCardFilter, activeFilterCount, clearFilter,
      copyTask:    handleCopyTask,
      archivedTasks, showArchive, toggleArchive,
      archiveTask: handleArchiveTask,
      restoreTask: handleRestoreTask,
      boardLocked, toggleBoardLock,
      updateBoardBackground:    handleUpdateBoardBackground,
      notifications, unreadCount,
      markNotificationRead:     handleMarkNotifRead,
      markAllNotificationsRead: handleMarkAllNotifsRead,
      deleteNotification:         handleDeleteNotification,
      deleteAllReadNotifications: handleDeleteAllReadNotifications,
    }}>
      {children}
    </KanbanContext.Provider>
  );
}

export function useKanban(): KanbanCtx {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error('useKanban must be inside KanbanProvider');
  return ctx;
}
