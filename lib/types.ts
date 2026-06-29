// ── UI 레이어 타입 ──────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  ini: string;
}

/** Firestore users/{uid} 문서 — 로그인 시 자동 생성/갱신 */
export interface UserProfile {
  uid:      string;
  name:     string;
  email:    string;
  photoURL: string | null;
}

export interface LabelDef {
  bg: string;
  c: string;
  n: string;
}

export interface CheckItem {
  text: string;
  done: boolean;
}

export interface Comment {
  author: string;
  text: string;
  time: string;
}

export interface ActivityLog {
  type:     'created' | 'assignee_added' | 'assignee_removed' | 'column_moved'
            | 'due_changed' | 'comment_added' | 'archived' | 'restored';
  actor:    string; // uid
  time:     string;
  payload?: Record<string, string>;
}

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface CardFilter {
  assignees:  string[];   // UID 목록 (OR)
  priorities: Priority[]; // 우선순위 목록 (OR)
  labelIds:   string[];   // 라벨 ID 목록 (OR)
}

export interface Task {
  id:        string;
  columnId?: string;   // 소속 컬럼 ID (아카이브 복원 시 원위치로)
  title:     string;
  labels:    string[];
  assignees: string[];
  due?:      string;
  desc:      string;
  checklist: CheckItem[];
  comments:  Comment[];
  archived?: boolean;
  logs?:     ActivityLog[];
  priority?: Priority;
}

/** 컨텍스트에서 UI 컴포넌트에 전달되는 컬럼 형태 */
export interface ColumnState {
  id: string;
  name: string;
  color: string;
  tasks: string[]; // taskIds (순서 포함)
}

// ── Firestore 문서 타입 ─────────────────────────────────────────

/** 보드별 사용자 정의 라벨 */
export interface BoardLabel {
  id: string;
  name: string;
  bg: string; // 배경색 (hex)
  c: string;  // 텍스트색 (hex)
}

/** Firestore boards/{boardId}.columns[] 의 컬럼 요소 */
export interface FirestoreColumn {
  id: string;
  name: string;
  color: string;
  taskIds: string[]; // 카드 순서가 담긴 배열
}

/** Firestore boards/{boardId} 문서 */
export interface FirestoreBoard {
  id: string;
  name: string;
  type: 'private' | 'shared' | 'team';
  color: string;
  ownerId: string;
  memberIds: string[];
  columns: FirestoreColumn[];
  labels: BoardLabel[];
  createdAt?: unknown; // Firestore Timestamp
  bg?: string;         // 보드 배경 (CSS gradient/color 문자열)
}

export interface AppNotification {
  id: string;
  type: 'mention' | 'assigned';
  boardId: string;
  boardName: string;
  taskId: string;
  taskTitle: string;
  fromUid: string;
  fromName: string;
  commentText: string;
  read: boolean;
  createdAt: string;
  ts: number;
}
