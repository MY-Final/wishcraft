/**
 * OWNER: three
 * 核实状态 → 等宽大写标签。只在 3D 浮签里使用，避免与页面组件文案分叉。
 */
import type { VerificationStatus } from '../../data/types';

export function verificationLabel(status: VerificationStatus): string {
  if (status === 'verified') return 'VERIFIED';
  if (status === 'partially-verified') return '部分核实 · PARTIAL';
  return 'UNVERIFIED';
}
