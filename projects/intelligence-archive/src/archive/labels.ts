import type { DatePrecision, DateType, EventCategory, SourceKind } from '../data/types';

export const dateTypeLabel: Record<DateType, string> = {
  paper: '论文发表',
  announcement: '官方公布',
  product: '产品上线',
  api: 'API 开放',
  weights: '开放权重',
  conference: '会议发布',
  policy: '政策文件',
};

export const datePrecisionLabel: Record<DatePrecision, string> = {
  day: '精确到日',
  month: '精确到月',
  year: '精确到年',
};

export const eventCategoryLabel: Record<EventCategory, string> = {
  theory: '理论与思想',
  breakthrough: '技术突破',
  system: '系统与里程碑',
  product: '产品',
  organization: '机构',
  science: '科学应用',
  policy: '政策与治理',
  hardware: '硬件',
};

export const sourceKindLabel: Record<SourceKind, string> = {
  official: '官方',
  paper: '论文',
  docs: '文档',
  weights: '权重',
  press: '媒体',
  archive: '档案',
};

const countries: Record<string, string> = {
  US: '美国',
  CN: '中国',
  UK: '英国',
  FR: '法国',
  CA: '加拿大',
  IL: '以色列',
  AE: '阿联酋',
  EU: '欧盟',
  DE: '德国',
  JP: '日本',
  KR: '韩国',
  SG: '新加坡',
  IN: '印度',
  CH: '瑞士',
  RU: '俄罗斯',
};

export function countryName(code: string): string {
  if (!code) return '—';
  return countries[code.toUpperCase()] ?? code;
}

export function chapterLabel(index: number): string {
  return `CHAPTER ${String(index).padStart(2, '0')}`;
}
