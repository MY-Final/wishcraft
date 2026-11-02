/**
 * StreamScene 的两块 Canvas 面板绘制：
 *  - SSE 事件预览：当前经过的事件携带哪一段文本；
 *  - 客户端窗口：可见 Token 累积成的答案文本（由 data/metrics 计算）。
 *
 * 两者都只在内容变化时重绘，拖动时间轴也只会重画有限次数。
 */
import { PALETTE } from '../../kit/palette';
import { FONT_MONO, FONT_SANS, roundedRect } from '../../kit/textures';
import { answerTextThrough } from '../../../data/metrics';
import type { SseEvent } from '../../../data/request';

export function wrapIntoLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const characters = [...text];
  const lines: string[] = [];
  while (characters.length > 0 && lines.length < maxLines) {
    let line = '';
    while (characters.length > 0) {
      const next = line + characters[0];
      if (line.length > 0 && context.measureText(next).width > maxWidth) break;
      line = next;
      characters.shift();
    }
    lines.push(line);
  }
  if (characters.length > 0 && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  }
  return lines;
}

export function paintEventPreview(canvas: HTMLCanvasElement, event: SseEvent | null): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = 'rgba(250, 249, 245, 0.96)';
  roundedRect(context, 1, 1, width - 2, height - 2, 10);
  context.fill();
  context.strokeStyle = 'rgba(20, 20, 20, 0.14)';
  context.lineWidth = 2;
  roundedRect(context, 1, 1, width - 2, height - 2, 10);
  context.stroke();
  context.textAlign = 'left';
  context.textBaseline = 'top';

  context.fillStyle = PALETTE.teal;
  context.font = `500 24px ${FONT_MONO}`;
  context.fillText(
    event ? `EVENT ${String(event.id).padStart(2, '0')} · SSE` : 'SSE · text/event-stream',
    26,
    22,
  );

  if (event) {
    context.fillStyle = PALETTE.ink;
    context.font = `500 33px ${FONT_SANS}`;
    wrapIntoLines(context, event.text, width - 52, 2).forEach((line, index) => {
      context.fillText(line, 26, 68 + index * 42);
    });
    context.fillStyle = PALETTE.muted;
    context.font = `400 20px ${FONT_MONO}`;
    context.fillText(`TOKENS ${event.tokenStart}–${event.tokenEnd}`, 26, height - 44);
  }
}

export function paintClientScreen(canvas: HTMLCanvasElement, visibleTokens: number): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fbfaf6';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(20, 20, 20, 0.05)';
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  context.strokeStyle = 'rgba(20, 20, 20, 0.12)';
  context.lineWidth = 2;
  context.strokeRect(1, 1, width - 2, height - 2);

  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.font = `500 30px ${FONT_SANS}`;
  const text = answerTextThrough(visibleTokens);
  const lines = wrapIntoLines(context, text, width - 92, 8);

  context.fillStyle = PALETTE.ink;
  lines.forEach((line, index) => {
    context.fillText(line, 46, 46 + index * 46);
  });

  const lastLine = lines[lines.length - 1] ?? '';
  const caretX = 46 + context.measureText(lastLine).width + 4;
  const caretY = 46 + Math.max(0, lines.length - 1) * 46;
  context.fillStyle = PALETTE.orange;
  context.fillRect(caretX, caretY + 2, 3, 30);
}
