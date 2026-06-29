/**
 * 정적 참조 데이터 (Firestore로 옮기지 않는 상수들)
 * BOARDS / TASKS_RAW는 Firestore로 이전되어 여기서 제거됨.
 */
import type { User, LabelDef } from './types';

/** 라벨 색상 프리셋 (보드별 라벨 생성 시 선택) */
export const LABEL_COLOR_PRESETS: Array<{ bg: string; c: string }> = [
  { bg: '#EEEDFE', c: '#534AB7' },
  { bg: '#E1F5EE', c: '#0F6E56' },
  { bg: '#E6F1FB', c: '#185FA5' },
  { bg: '#FAEEDA', c: '#854F0B' },
  { bg: '#FAECE7', c: '#993C1D' },
  { bg: '#FBEAF0', c: '#993556' },
  { bg: '#F1EFE8', c: '#5F5E5A' },
  { bg: '#FCEBEB', c: '#A32D2D' },
];

export const ACOLORS: [string, string][] = [
  ['#EEEDFE', '#534AB7'],
  ['#E1F5EE', '#0F6E56'],
  ['#E6F1FB', '#185FA5'],
  ['#FAEEDA', '#854F0B'],
  ['#FAECE7', '#993C1D'],
  ['#FBEAF0', '#993556'],
];

export const COL_DOTS: Record<string, string> = {
  purple: '#7F77DD',
  blue:   '#378ADD',
  green:  '#639922',
  amber:  '#EF9F27',
  red:    '#E24B4A',
  teal:   '#1D9E75',
  coral:  '#D85A30',
  pink:   '#D4537E',
  gray:   '#888780',
};

// Auth 연동 전 임시 사용자 목록 (다음 단계: Firestore users 컬렉션으로 이동)
export const USERS: User[] = [
  { id: 'u1', name: '김민준', ini: '민준' },
  { id: 'u2', name: '이서연', ini: '서연' },
  { id: 'u3', name: '박지훈', ini: '지훈' },
  { id: 'u4', name: '최수아', ini: '수아' },
  { id: 'u5', name: '정도윤', ini: '도윤' },
  { id: 'u6', name: '한예린', ini: '예린' },
];

export const LABELS: Record<string, LabelDef> = {
  research:    { bg: '#E6F1FB', c: '#185FA5', n: '리서치' },
  devops:      { bg: '#F1EFE8', c: '#5F5E5A', n: 'DevOps' },
  feature:     { bg: '#EEEDFE', c: '#534AB7', n: '기능' },
  ui:          { bg: '#FBEAF0', c: '#993556', n: 'UI/UX' },
  a11y:        { bg: '#E1F5EE', c: '#0F6E56', n: '접근성' },
  refactor:    { bg: '#FAEEDA', c: '#854F0B', n: '리팩터' },
  design:      { bg: '#FBEAF0', c: '#993556', n: '디자인' },
  docs:        { bg: '#F1EFE8', c: '#5F5E5A', n: '문서' },
  testing:     { bg: '#FCEBEB', c: '#A32D2D', n: '테스트' },
  performance: { bg: '#EAF3DE', c: '#3B6D11', n: '성능' },
  backend:     { bg: '#E6F1FB', c: '#185FA5', n: '백엔드' },
  review:      { bg: '#FAEEDA', c: '#854F0B', n: '리뷰' },
  campaign:    { bg: '#FAECE7', c: '#993C1D', n: '캠페인' },
  content:     { bg: '#E1F5EE', c: '#0F6E56', n: '콘텐츠' },
};
