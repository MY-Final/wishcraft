import { Component, type ErrorInfo, type ReactNode } from 'react';

interface StageBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface StageBoundaryState {
  failed: boolean;
}

/**
 * 3D 舞台的降级边界：WebGL 不可用或场景抛错时，退回章节内的二维 SVG 星图，
 * 页面其余部分（文字、档案、正文页）完全不受影响。
 */
export default class StageBoundary extends Component<StageBoundaryProps, StageBoundaryState> {
  state: StageBoundaryState = { failed: false };

  static getDerivedStateFromError(): StageBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.warn('[ch05] 3D 星图不可用，已切换到 SVG 降级：', error.message, info.componentStack);
    }
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
