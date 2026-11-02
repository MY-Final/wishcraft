import type { CSSProperties } from 'react';

/** 把 `--custom-property` 映射为 style 对象（React 类型里没有索引签名）。 */
export function vars(values: Record<string, string | number>): CSSProperties {
  return values as unknown as CSSProperties;
}
