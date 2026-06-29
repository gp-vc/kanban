/**
 * ─────────────────────────────────────────────────────────────────
 * Firestore 데이터베이스 스키마
 * ─────────────────────────────────────────────────────────────────
 *
 * ┌ Collection: boards
 * │  └ {boardId}                        ← 문서 1개 = 보드 전체 구조
 * │      id          string
 * │      name        string
 * │      type        "private" | "team"
 * │      color       string
 * │      ownerId     string
 * │      memberIds   string[]            ← ownerId 항상 포함
 * │      columns     Array<{             ← ★ 서브컬렉션 X, 문서에 내장
 * │                    id:      string
 * │                    name:    string
 * │                    color:   string
 * │                    taskIds: string[] ← 카드 순서가 담긴 배열
 * │                  }>
 * │      createdAt   Timestamp
 * │
 * └ Collection: tasks
 *    └ {taskId}                          ← 보드와 별도 최상위 컬렉션
 *        id          string
 *        boardId     string              ← 쿼리용 역참조
 *        columnId    string              ← 현재 소속 컬럼 (보드와 batch 동기화)
 *        title       string
 *        desc        string
 *        labels      string[]
 *        assignees   string[]
 *        due         string | null
 *        checklist   Array<{ text: string, done: boolean }>
 *        comments    Array<{ author: string, text: string, time: string }>
 *        createdAt   Timestamp
 *        updatedAt   Timestamp
 *
 * ─ 설계 근거 ──────────────────────────────────────────────────────
 *
 * 1. columns를 board 문서에 내장 (embed)
 *    - 보드를 열 때 컬럼 구조를 항상 함께 읽으므로 1 read로 해결
 *    - 컬럼은 보통 5~10개 → 문서 1 MB 한도에 안전
 *    - taskIds 배열로 순서를 관리 → order 숫자 필드 대비 재정렬 비용 없음
 *
 * 2. tasks를 최상위 컬렉션으로 분리
 *    - 카드 하나 수정 시 board 문서를 건드리지 않음
 *    - boardId where 절 1개 쿼리로 보드의 모든 카드를 실시간 구독
 *    - 나중에 cross-board 카드 이동 지원 가능
 *
 * 3. 드래그 시 batch write (2 writes)
 *    - board.columns[].taskIds 업데이트 (순서 + 소속 컬럼)
 *    - task.columnId 업데이트 (컬럼 간 이동 시)
 *    ─────────────────────────────────────────────────────────────────
 */

import {
  collection, doc, query, where, setDoc,
  onSnapshot, writeBatch, updateDoc, deleteDoc,
  addDoc, serverTimestamp, arrayUnion, deleteField,
  DocumentData, QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Task, CheckItem, Comment, ActivityLog, FirestoreBoard, FirestoreColumn, BoardLabel, UserProfile, AppNotification } from './types';

// 더 이상 사용하지 않지만 혹시 남아있는 참조 대비 export 유지
export const CURRENT_USER_ID = '';

// 팀 보드를 구성원 모두에게 노출하기 위한 sentinel 값
// memberIds에 포함시키면 모든 gp-vc.com 유저의 쿼리에 걸림
export const TEAM_SENTINEL = '__team__';

// ═══════════════════════════════════════════════════════════════════
// 실시간 구독 (Subscriptions)
// ═══════════════════════════════════════════════════════════════════

/**
 * userId가 memberIds에 포함된 모든 보드를 실시간 구독.
 * 보드 생성 시 owner를 memberIds에 항상 포함시켜야 함.
 * @returns unsubscribe 함수
 */
export function subscribeToBoardsList(
  userId: string,
  onBoards: (boards: FirestoreBoard[]) => void,
  onError?: (err: Error) => void
): () => void {
  // 개인 보드: memberIds에 userId 포함
  // 팀 보드:   memberIds에 TEAM_SENTINEL('__team__') 포함
  const q = query(
    collection(db, 'boards'),
    where('memberIds', 'array-contains-any', [userId, TEAM_SENTINEL])
  );
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const boards = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...(data as Omit<FirestoreBoard, 'id'>),
          labels: data.labels ?? [], // 기존 보드(labels 필드 없음) 호환
        };
      });
      // createdAt 기준 정렬 (Firestore orderBy 대신 클라이언트 정렬로 복합 인덱스 불필요)
      boards.sort((a, b) => {
        const ta = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const tb = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return ta - tb;
      });
      onBoards(boards);
    },
    (err) => {
      console.error('[Firestore] subscribeToBoardsList:', err);
      onError?.(err);
    }
  );
}

/**
 * 특정 보드에 속한 모든 task를 실시간 구독.
 * Record<taskId, Task> 형태로 반환하여 O(1) 조회 지원.
 * @returns unsubscribe 함수
 */
export function subscribeToBoardTasks(
  boardId: string,
  onTasks: (tasks: Record<string, Task>) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, 'tasks'),
    where('boardId', '==', boardId)
  );
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const tasks: Record<string, Task> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        tasks[d.id] = {
          id:        d.id,
          columnId:  data.columnId  ?? undefined,
          title:     data.title     ?? '',
          desc:      data.desc      ?? '',
          labels:    data.labels    ?? [],
          assignees: data.assignees ?? [],
          due:       data.due       ?? undefined,
          checklist: data.checklist ?? [],
          comments:  data.comments  ?? [],
          archived:  data.archived  ?? false,
          logs:      data.logs      ?? [],
          priority:  data.priority  ?? undefined,
        };
      });
      onTasks(tasks);
    },
    (err) => {
      console.error('[Firestore] subscribeToBoardTasks:', err);
      onError?.(err);
    }
  );
}

// ═══════════════════════════════════════════════════════════════════
// Board 변경 (Board Mutations)
// ═══════════════════════════════════════════════════════════════════

export async function createBoard(
  userId: string,
  data: {
    name: string;
    type: 'private' | 'shared' | 'team';
    color: string;
    columns: Omit<FirestoreColumn, 'taskIds'>[];
    initialMemberIds?: string[]; // shared 타입에서 초대할 멤버 UID 목록
  }
): Promise<string> {
  let memberIds: string[];
  if (data.type === 'team') {
    memberIds = [TEAM_SENTINEL, userId];
  } else if (data.type === 'shared') {
    memberIds = [...new Set([userId, ...(data.initialMemberIds ?? [])])];
  } else {
    memberIds = [userId];
  }

  const ref = await addDoc(collection(db, 'boards'), {
    name:      data.name,
    type:      data.type,
    color:     data.color,
    ownerId:   userId,
    memberIds,
    columns:   data.columns.map(c => ({ ...c, taskIds: [] })),
    labels:    [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ═══════════════════════════════════════════════════════════════════
// Task 변경 (Task Mutations)
// ═══════════════════════════════════════════════════════════════════

/**
 * 새 task 생성 + board의 column.taskIds 말미에 추가.
 * batch write으로 원자적 처리.
 */
export async function createTask(
  boardId: string,
  columnId: string,
  data: Pick<Task, 'title' | 'desc' | 'labels' | 'assignees' | 'due'>,
  currentColumns: FirestoreColumn[]
): Promise<string> {
  const batch = writeBatch(db);

  const taskRef = doc(collection(db, 'tasks'));
  batch.set(taskRef, {
    boardId,
    columnId,
    title:     data.title,
    desc:      data.desc      ?? '',
    labels:    data.labels    ?? [],
    assignees: data.assignees ?? [],
    due:       data.due       ?? null,
    checklist: [],
    comments:  [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const newColumns = currentColumns.map(col =>
    col.id === columnId
      ? { ...col, taskIds: [...col.taskIds, taskRef.id] }
      : col
  );
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });

  await batch.commit();
  return taskRef.id;
}

/**
 * 드래그 종료 시 호출.
 * batch write으로 두 가지를 원자적으로 처리:
 *   1. board.columns[].taskIds (컬럼 내 순서 + 소속 컬럼 변경)
 *   2. task.columnId (컬럼 간 이동일 때만)
 *
 * @param currentColumns  호출 시점의 board.columns (optimistic update 이전 값)
 */
export async function moveTask(
  boardId: string,
  currentColumns: FirestoreColumn[],
  taskId: string,
  srcColId: string,
  dstColId: string,
  dstIndex: number
): Promise<void> {
  const newColumns = currentColumns.map(col => {
    // 같은 컬럼 내 순서 변경
    if (col.id === srcColId && col.id === dstColId) {
      const ids = col.taskIds.filter(id => id !== taskId);
      ids.splice(dstIndex, 0, taskId);
      return { ...col, taskIds: ids };
    }
    // 소스 컬럼에서 제거
    if (col.id === srcColId) {
      return { ...col, taskIds: col.taskIds.filter(id => id !== taskId) };
    }
    // 대상 컬럼에 삽입
    if (col.id === dstColId) {
      const ids = col.taskIds.filter(id => id !== taskId);
      ids.splice(dstIndex, 0, taskId);
      return { ...col, taskIds: ids };
    }
    return col;
  });

  const batch = writeBatch(db);
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });

  // 컬럼 간 이동일 때만 task.columnId 업데이트
  if (srcColId !== dstColId) {
    batch.update(doc(db, 'tasks', taskId), {
      columnId:  dstColId,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * 체크리스트 전체 배열을 덮어씀.
 * Firestore는 배열 요소 단위 업데이트를 지원하지 않으므로
 * 변경된 전체 배열을 전송.
 */
export async function updateChecklist(
  taskId: string,
  checklist: CheckItem[]
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    checklist,
    updatedAt: serverTimestamp(),
  });
}

/**
 * arrayUnion으로 댓글 추가 → 동시 접근 시 충돌 없이 안전하게 append.
 */
export async function addComment(
  taskId: string,
  comment: Comment
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    comments:  arrayUnion(comment),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTaskFields(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'desc' | 'labels' | 'assignees' | 'due' | 'priority'>>
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates, updatedAt: serverTimestamp() };
  // undefined 값은 Firestore가 거부하므로 deleteField()로 교체
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) payload[key] = deleteField();
  }
  await updateDoc(doc(db, 'tasks', taskId), payload);
}

// ═══════════════════════════════════════════════════════════════════
// Column 변경 (Column Mutations)
// ═══════════════════════════════════════════════════════════════════

export async function reorderColumns(
  boardId: string,
  currentColumns: FirestoreColumn[],
  srcIndex: number,
  dstIndex: number
): Promise<void> {
  const newColumns = [...currentColumns];
  const [moved] = newColumns.splice(srcIndex, 1);
  newColumns.splice(dstIndex, 0, moved);
  await updateDoc(doc(db, 'boards', boardId), { columns: newColumns });
}

export async function addColumn(
  boardId: string,
  currentColumns: FirestoreColumn[],
  column: Omit<FirestoreColumn, 'taskIds'>
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), {
    columns: [...currentColumns, { ...column, taskIds: [] }],
  });
}

export async function renameColumn(
  boardId: string,
  currentColumns: FirestoreColumn[],
  columnId: string,
  newName: string
): Promise<void> {
  const newColumns = currentColumns.map(col =>
    col.id === columnId ? { ...col, name: newName } : col
  );
  await updateDoc(doc(db, 'boards', boardId), { columns: newColumns });
}

/**
 * 컬럼 삭제 + 해당 컬럼의 모든 task 삭제를 batch로 원자적 처리.
 */
export async function deleteColumn(
  boardId: string,
  currentColumns: FirestoreColumn[],
  columnId: string
): Promise<void> {
  const col = currentColumns.find(c => c.id === columnId);
  if (!col) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'boards', boardId), {
    columns: currentColumns.filter(c => c.id !== columnId),
  });
  col.taskIds.forEach(taskId => batch.delete(doc(db, 'tasks', taskId)));
  await batch.commit();
}

// ═══════════════════════════════════════════════════════════════════
// Label 변경 (Board Label Mutations)
// ═══════════════════════════════════════════════════════════════════

export async function updateBoardLabels(
  boardId: string,
  labels: BoardLabel[]
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), { labels });
}

// ═══════════════════════════════════════════════════════════════════
// 삭제 / 이동 / 보드 수정 (Deletions, Moves, Board Updates)
// ═══════════════════════════════════════════════════════════════════

export async function deleteTask(
  boardId: string,
  taskId: string,
  currentColumns: FirestoreColumn[]
): Promise<void> {
  const newColumns = currentColumns.map(col => ({
    ...col,
    taskIds: col.taskIds.filter(id => id !== taskId),
  }));
  const batch = writeBatch(db);
  batch.delete(doc(db, 'tasks', taskId));
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });
  await batch.commit();
}

/** boards 문서 + 모든 소속 tasks를 batch로 삭제. */
export async function deleteBoard(
  boardId: string,
  columns: FirestoreColumn[]
): Promise<void> {
  const taskIds = columns.flatMap(col => col.taskIds);
  const batch = writeBatch(db);
  batch.delete(doc(db, 'boards', boardId));
  taskIds.forEach(taskId => batch.delete(doc(db, 'tasks', taskId)));
  await batch.commit();
}

/** 모달에서 카드를 다른 컬럼으로 이동 (대상 컬럼 말미에 추가). */
export async function moveTaskToColumn(
  boardId: string,
  currentColumns: FirestoreColumn[],
  taskId: string,
  srcColId: string,
  dstColId: string
): Promise<void> {
  const newColumns = currentColumns.map(col => {
    if (col.id === srcColId) return { ...col, taskIds: col.taskIds.filter(id => id !== taskId) };
    if (col.id === dstColId) return { ...col, taskIds: [...col.taskIds, taskId] };
    return col;
  });
  const batch = writeBatch(db);
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });
  batch.update(doc(db, 'tasks', taskId), { columnId: dstColId, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function updateBoard(
  boardId: string,
  updates: { name?: string; color?: string }
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), updates);
}

/** 보드 멤버 목록 업데이트 (초대/제거). memberIds에는 항상 ownerId가 포함되어야 함. */
export async function updateBoardMembers(
  boardId: string,
  memberIds: string[],
  type: 'private' | 'shared' | 'team'
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), { memberIds, type });
}

export async function updateTaskComments(
  taskId: string,
  comments: Comment[]
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    comments,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════
// 아카이브 / 활동 로그 (Archive & Activity Log)
// ═══════════════════════════════════════════════════════════════════

/** 카드를 아카이브 — board.columns taskIds에서 제거 + archived: true */
export async function archiveTask(
  boardId: string,
  taskId: string,
  currentColumns: FirestoreColumn[]
): Promise<void> {
  const newColumns = currentColumns.map(col => ({
    ...col,
    taskIds: col.taskIds.filter(id => id !== taskId),
  }));
  const batch = writeBatch(db);
  batch.update(doc(db, 'tasks', taskId), { archived: true, updatedAt: serverTimestamp() });
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });
  await batch.commit();
}

/** 아카이브된 카드를 원래 컬럼(또는 첫 번째 컬럼)으로 복원 */
export async function restoreTask(
  boardId: string,
  taskId: string,
  targetColumnId: string,
  currentColumns: FirestoreColumn[]
): Promise<void> {
  const colExists = currentColumns.some(c => c.id === targetColumnId);
  const colId = colExists ? targetColumnId : (currentColumns[0]?.id ?? '');
  if (!colId) return;

  const newColumns = currentColumns.map(col =>
    col.id === colId ? { ...col, taskIds: [...col.taskIds, taskId] } : col
  );
  const batch = writeBatch(db);
  batch.update(doc(db, 'tasks', taskId), {
    archived: false, columnId: colId, updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });
  await batch.commit();
}

/** 활동 로그 항목 1개 추가 (arrayUnion으로 충돌 없이 append) */
export async function appendActivityLog(
  taskId: string,
  log: ActivityLog
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    logs: arrayUnion(log),
  });
}

/** 카드를 대상 컬럼에 복사 (댓글 제외, 체크리스트는 미완료 상태로 초기화) */
export async function copyTask(
  boardId: string,
  targetColumnId: string,
  sourceTask: Task,
  currentColumns: FirestoreColumn[]
): Promise<string> {
  const batch = writeBatch(db);

  const taskRef = doc(collection(db, 'tasks'));
  batch.set(taskRef, {
    boardId,
    columnId: targetColumnId,
    title:     `${sourceTask.title} (복사)`,
    desc:      sourceTask.desc,
    labels:    [...sourceTask.labels],
    assignees: [...sourceTask.assignees],
    due:       sourceTask.due ?? null,
    checklist: sourceTask.checklist.map(item => ({ text: item.text, done: false })),
    comments:  [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const newColumns = currentColumns.map(col =>
    col.id === targetColumnId
      ? { ...col, taskIds: [...col.taskIds, taskRef.id] }
      : col
  );
  batch.update(doc(db, 'boards', boardId), { columns: newColumns });

  await batch.commit();
  return taskRef.id;
}

// ═══════════════════════════════════════════════════════════════════
// 사용자 프로필 (User Profiles)
// ═══════════════════════════════════════════════════════════════════

/**
 * 로그인 시 users/{uid} 문서를 생성 또는 갱신.
 * merge: true 로 기존 필드(createdAt 등)를 보존하면서 최신 프로필 반영.
 */
export async function upsertUserProfile(
  uid: string,
  name: string,
  email: string,
  photoURL: string | null
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { name, email, photoURL, lastSeenAt: serverTimestamp() },
    { merge: true }
  );
}

/** gp-vc.com 전체 구성원 목록을 실시간 구독. */
export function subscribeToUsers(
  onUsers: (users: UserProfile[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const users: UserProfile[] = snap.docs.map(d => ({
        uid:      d.id,
        name:     d.data().name     ?? '',
        email:    d.data().email    ?? '',
        photoURL: d.data().photoURL ?? null,
      }));
      users.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      onUsers(users);
    },
    (err) => {
      console.error('[Firestore] subscribeToUsers 권한 오류 — Firestore Rules에 users 컬렉션 규칙이 추가됐는지 확인하세요:', err);
    }
  );
}

// ═══════════════════════════════════════════════════════════════════
// 보드 배경 커스터마이즈 (Board Background)
// ═══════════════════════════════════════════════════════════════════

export async function updateBoardBackground(
  boardId: string,
  bg: string
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), { bg });
}

// ═══════════════════════════════════════════════════════════════════
// @멘션 알림 (Mention Notifications)
// Firestore Rules 필요:
//   match /notifications/{userId}/items/{itemId} {
//     allow read: if request.auth.uid == userId;
//     allow write: if request.auth != null;
//   }
// ═══════════════════════════════════════════════════════════════════

export async function createMentionNotification(
  toUid: string,
  data: Omit<AppNotification, 'id'>
): Promise<void> {
  await addDoc(
    collection(db, 'notifications', toUid, 'items'),
    data
  );
}

export function subscribeToNotifications(
  userId: string,
  onNotifs: (notifs: AppNotification[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'notifications', userId, 'items'),
    (snap) => {
      const notifs: AppNotification[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, 'id'>),
      }));
      notifs.sort((a, b) => b.ts - a.ts);
      onNotifs(notifs.slice(0, 30));
    },
    (err) => {
      console.error('[Firestore] subscribeToNotifications:', err);
    }
  );
}

export async function markNotificationRead(
  userId: string,
  notifId: string
): Promise<void> {
  await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { read: true });
}

export async function markAllNotificationsRead(
  userId: string,
  notifIds: string[]
): Promise<void> {
  if (notifIds.length === 0) return;
  const batch = writeBatch(db);
  notifIds.forEach(id => {
    batch.update(doc(db, 'notifications', userId, 'items', id), { read: true });
  });
  await batch.commit();
}

export async function deleteNotification(
  userId: string,
  notifId: string
): Promise<void> {
  await deleteDoc(doc(db, 'notifications', userId, 'items', notifId));
}

export async function deleteAllReadNotifications(
  userId: string,
  notifIds: string[]
): Promise<void> {
  if (notifIds.length === 0) return;
  const batch = writeBatch(db);
  notifIds.forEach(id => batch.delete(doc(db, 'notifications', userId, 'items', id)));
  await batch.commit();
}
