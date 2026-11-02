import { Color } from 'three';

/** Paper, graphite and two restrained signal colours. No gradients in the 3D scene. */
export const PALETTE = {
  paper: '#f4f3ef',
  white: '#ffffff',
  ink: '#141414',
  graphite: '#2a2b29',
  graphiteSoft: '#4d4e4a',
  muted: '#787871',
  hairline: '#d7d5cd',
  hairlineSoft: '#e8e6df',
  orange: '#e4572a',
  orangeLight: '#f39a72',
  orangeDeep: '#bf3f1a',
  teal: '#247c70',
  tealLight: '#8bcfc2',
  tealDeep: '#155f57',
  shadow: '#7e7b72',
} as const;

export type PaletteKey = keyof typeof PALETTE;

export function color(hex: string | number): Color {
  return new Color(hex);
}

export function cssColor(key: PaletteKey): string {
  return PALETTE[key];
}
