/**
 * OWNER: three
 * 章节内嵌 3D 舞台的“存在感”注册表。
 *
 * 第二章（NetworkStage）与第五章（ConstellationStage）会把画布挂进 section。
 * 当它们真正出现在视口里时，全局 MONOLITH 在对应章节自动减弱，
 * 避免两套同样语言的线框互相打架。这里用模块级 Set，
 * 不使用 React context，避免每帧 setState。
 */

export type StageKind = 'network' | 'constellation' | 'action';

const visible = new Set<StageKind>();

export function setStageVisible(kind: StageKind, isVisible: boolean): void {
  if (isVisible) visible.add(kind);
  else visible.delete(kind);
}

export function isStageVisible(kind: StageKind): boolean {
  return visible.has(kind);
}

/** 内嵌舞台可见时，全局 MONOLITH 的透光系数（1 = 不减弱）。 */
export function monolithPresenceFactor(chapter: number): number {
  if (chapter === 2 && visible.has('network')) return 0.4;
  if (chapter === 5 && visible.has('constellation')) return 0.25;
  if (chapter === 7 && visible.has('action')) return 0.45;
  return 1;
}

/** SSR / 测试环境清理 */
export function clearStagePresence(): void {
  visible.clear();
}
