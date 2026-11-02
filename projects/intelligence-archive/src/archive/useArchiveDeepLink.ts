import { useEffect, useRef } from 'react';

/**
 * 详情浮层与 URL 同步：#/archive/<id> 可直接访问、可刷新还原。
 * 使用 replaceState 而不是修改 hash，避免触发 hashchange 导致路由重渲染。
 */
export function useArchiveDeepLink(modelId: string | null): void {
  const previous = useRef<string | null>(modelId);

  useEffect(() => {
    if (modelId) {
      const target = `#/archive/${modelId}`;
      if (window.location.hash !== target) {
        window.history.replaceState(null, '', target);
      }
    } else if (previous.current !== null) {
      window.history.replaceState(null, '', '#/archive');
    }
    previous.current = modelId;
  }, [modelId]);
}
