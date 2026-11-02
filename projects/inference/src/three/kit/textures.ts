import {
  CanvasTexture,
  Color,
  DoubleSide,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Texture,
} from 'three';

export const FONT_SANS =
  '"Inter Tight", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
export const FONT_MONO =
  '"IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", monospace';

export interface LabelOptions {
  color?: string;
  subColor?: string;
  background?: string;
  border?: string;
  font?: string;
  subFont?: string;
  fontSize?: number;
  subFontSize?: number;
  paddingX?: number;
  paddingY?: number;
  tracking?: number;
  align?: CanvasTextAlign;
}

export interface LabelTexture {
  texture: CanvasTexture;
  aspect: number;
  width: number;
  height: number;
}

export function makeCanvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context is unavailable');
  context.clearRect(0, 0, width, height);
  draw(context, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function makeTextTexture(
  main: string,
  sub?: string,
  options: LabelOptions = {},
): LabelTexture {
  const fontSize = options.fontSize ?? 48;
  const subFontSize = options.subFontSize ?? fontSize * 0.42;
  const paddingX = options.paddingX ?? fontSize * 0.4;
  const paddingY = options.paddingY ?? fontSize * 0.28;
  const font = options.font ?? `500 ${fontSize}px ${FONT_SANS}`;
  const subFont = options.subFont ?? `400 ${subFontSize}px ${FONT_MONO}`;
  const scale = 2;

  const measureCanvas = document.createElement('canvas');
  const measure = measureCanvas.getContext('2d');
  if (!measure) throw new Error('2D canvas context is unavailable');
  measure.font = font;
  const mainWidth = measure.measureText(main).width;
  measure.font = subFont;
  const subWidth = sub ? measure.measureText(sub).width : 0;
  const width = Math.ceil((Math.max(mainWidth, subWidth) + paddingX * 2) * scale);
  const height = Math.ceil((fontSize + (sub ? subFontSize + fontSize * 0.22 : 0) + paddingY * 2) * scale);

  const texture = makeCanvasTexture(width, height, (context) => {
    context.scale(scale, scale);
    if (options.background) {
      context.fillStyle = options.background;
      roundedRect(context, 0.5, 0.5, width / scale - 1, height / scale - 1, 5);
      context.fill();
    }
    if (options.border) {
      context.strokeStyle = options.border;
      context.lineWidth = 1;
      roundedRect(context, 0.5, 0.5, width / scale - 1, height / scale - 1, 5);
      context.stroke();
    }
    context.textAlign = options.align ?? 'left';
    context.textBaseline = 'top';
    const x = options.align === 'center' ? width / scale / 2 : paddingX;
    context.font = font;
    if ('letterSpacing' in context) context.letterSpacing = `${options.tracking ?? 0}px`;
    context.fillStyle = options.color ?? '#141414';
    context.fillText(main, x, paddingY);
    if (sub) {
      context.font = subFont;
      if ('letterSpacing' in context) context.letterSpacing = '1px';
      context.fillStyle = options.subColor ?? '#787871';
      context.fillText(sub, x, paddingY + fontSize + fontSize * 0.16);
    }
  });

  return { texture, aspect: width / height, width, height };
}

export function makePlaneLabel(
  main: string,
  sub: string | undefined,
  options: LabelOptions & { height?: number } = {},
): Mesh {
  const label = makeTextTexture(main, sub, options);
  const geometry = new PlaneGeometry((options.height ?? 0.32) * label.aspect, options.height ?? 0.32);
  const material = new MeshBasicMaterial({
    map: label.texture,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 5;
  mesh.userData.texture = label.texture;
  return mesh;
}

export function makeSpriteLabel(
  main: string,
  sub: string | undefined,
  options: LabelOptions & { height?: number; opacity?: number } = {},
): Sprite {
  const label = makeTextTexture(main, sub, options);
  const material = new SpriteMaterial({
    map: label.texture,
    transparent: true,
    depthWrite: false,
    opacity: options.opacity ?? 1,
    toneMapped: false,
  });
  const sprite = new Sprite(material);
  const height = options.height ?? 0.34;
  sprite.scale.set(height * label.aspect, height, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export function makeTokenTexture(
  display: string,
  id: number,
  index: number,
): { texture: CanvasTexture; aspect: number } {
  const width = 512;
  const height = 420;
  const texture = makeCanvasTexture(width, height, (context) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(250, 249, 245, 0.92)';
    roundedRect(context, 1, 1, width - 2, height - 2, 12);
    context.fill();
    context.strokeStyle = 'rgba(20,20,20,0.16)';
    context.lineWidth = 2;
    roundedRect(context, 1, 1, width - 2, height - 2, 12);
    context.stroke();

    context.fillStyle = '#141414';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const chars = [...display].length;
    const fontSize = chars > 3 ? 104 : chars > 1 ? 138 : 180;
    context.font = `500 ${fontSize}px ${FONT_SANS}`;
    context.fillText(display, width / 2, 174);

    context.fillStyle = '#e4572a';
    context.font = `500 38px ${FONT_MONO}`;
    context.fillText(`#${id}`, width / 2, 300);

    context.fillStyle = '#787871';
    context.font = `400 26px ${FONT_MONO}`;
    context.fillText(`POS ${String(index).padStart(2, '0')} · QWEN2.5`, width / 2, 356);
  });
  return { texture, aspect: width / height };
}

export function makeScreenTexture(width = 1536, height = 1024): CanvasTexture {
  return makeCanvasTexture(width, height, (context) => {
    context.fillStyle = '#fbfaf6';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(20,20,20,0.08)';
    context.lineWidth = 2;
    for (let x = 0; x < width; x += 48) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
  });
}

export function makeGlowTexture(color: Color | string = '#e4572a'): Texture {
  const size = 128;
  return makeCanvasTexture(size, size, (context) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.16, typeof color === 'string' ? color : `#${color.getHexString()}`);
    gradient.addColorStop(0.55, 'rgba(228,87,42,0.18)');
    gradient.addColorStop(1, 'rgba(228,87,42,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

export function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
