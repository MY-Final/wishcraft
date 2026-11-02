import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import { answerTextThrough } from '../../../data/metrics';
import { QUESTION_TEXT } from '../../../data/tokenization';
import { FONT_MONO, FONT_SANS, roundedRect } from '../../kit/textures';
import type { ClientMode, Phase } from '../../types';

const WIDTH = 1600;
const HEIGHT = 1000;

export interface ChatScreenState {
  phase: Phase;
  stageIndex: number;
  stageProgress: number;
  visibleTokens: number;
  clientMode: ClientMode;
}

/**
 * Draws the actual client UI into the 3D monitor's screen texture. It is a
 * real texture on a real mesh, not a DOM overlay pretending to be 3D.
 */
export class ChatScreen {
  readonly texture: CanvasTexture;
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private signature = '';

  constructor() {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('The client screen requires a 2D canvas context');
    this.context = context;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.anisotropy = 4;
    this.draw({
      phase: 'landing',
      stageIndex: 0,
      stageProgress: 0,
      visibleTokens: 0,
      clientMode: 'web',
    });
  }

  update(state: ChatScreenState): void {
    const signature = [
      state.phase,
      state.stageIndex,
      Math.round(state.stageProgress * 40),
      state.visibleTokens,
      state.clientMode,
    ].join('|');
    if (signature === this.signature) return;
    this.signature = signature;
    this.draw(state);
    this.texture.needsUpdate = true;
  }

  private draw(state: ChatScreenState): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // screen background
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#1b1c19');
    gradient.addColorStop(0.7, '#191a17');
    gradient.addColorStop(1, '#20211d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(244,243,239,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    // top chrome
    this.drawTopBar(state);
    this.drawConversation(state);
    this.drawComposer(state);
    this.drawFooter(state);
  }

  private drawTopBar(state: ChatScreenState): void {
    const ctx = this.context;
    ctx.fillStyle = 'rgba(244,243,239,0.035)';
    ctx.fillRect(0, 0, WIDTH, 108);
    ctx.strokeStyle = 'rgba(244,243,239,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 108);
    ctx.lineTo(WIDTH, 108);
    ctx.stroke();

    ctx.fillStyle = '#e4572a';
    ctx.beginPath();
    ctx.arc(64, 54, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(244,243,239,0.92)';
    ctx.font = `500 27px ${FONT_MONO}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('THE INFERENCE', 88, 55);

    ctx.fillStyle = 'rgba(244,243,239,0.36)';
    ctx.font = `400 20px ${FONT_SANS}`;
    ctx.fillText('模拟对话 / CLIENT', 330, 56);

    const status = state.phase === 'landing' ? 'READY' : state.stageIndex === 8 ? 'STREAMING' : 'REQUEST SENT';
    ctx.font = `400 19px ${FONT_MONO}`;
    const width = ctx.measureText(status).width;
    ctx.fillStyle = state.stageIndex === 8 ? '#8bcfc2' : 'rgba(244,243,239,0.44)';
    ctx.fillText(status, WIDTH - 64 - width, 55);
    ctx.strokeStyle = state.stageIndex === 8 ? '#8bcfc2' : 'rgba(244,243,239,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(WIDTH - 64 - width - 18, 55, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawConversation(state: ChatScreenState): void {
    const ctx = this.context;

    // user message: right aligned, graphite bubble
    const userX = 930;
    const userY = 156;
    const userWidth = 560;
    const userHeight = 94;
    ctx.fillStyle = '#2e302b';
    roundedRect(ctx, userX, userY, userWidth, userHeight, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(244,243,239,0.38)';
    ctx.font = `400 17px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText('YOU · 17:58', userX + userWidth - 26, userY - 20);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#f4f3ef';
    ctx.font = `400 40px ${FONT_SANS}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(QUESTION_TEXT, userX + 28, userY + userHeight / 2 + 2);

    // assistant label
    ctx.fillStyle = '#e4572a';
    ctx.beginPath();
    ctx.arc(66, 320, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(244,243,239,0.4)';
    ctx.font = `400 17px ${FONT_MONO}`;
    ctx.fillText('ASSISTANT · 模拟生成', 84, 321);

    // assistant content
    const left = 64;
    const top = 360;
    const maxWidth = 1120;
    ctx.textBaseline = 'top';

    if (state.phase === 'landing') {
      ctx.fillStyle = 'rgba(244,243,239,0.28)';
      ctx.font = `400 34px ${FONT_SANS}`;
      ctx.fillText('按下发送后，答案会在这里逐字出现。', left, top + 12);
    } else if (state.stageIndex === 0) {
      ctx.fillStyle = 'rgba(244,243,239,0.34)';
      ctx.font = `400 32px ${FONT_SANS}`;
      ctx.fillText('请求已发出，正在等待第一个 Token…', left, top + 12);
      ctx.fillStyle = 'rgba(228,87,42,0.75)';
      ctx.font = `400 18px ${FONT_MONO}`;
      ctx.fillText(
        state.clientMode === 'api' ? 'POST /v1/chat/completions · stream=true' : 'HTTPS → API GATEWAY → INFERENCE',
        left,
        top + 76,
      );
    } else if (state.stageIndex === 8) {
      const text = answerTextThrough(state.visibleTokens);
      if (text.length === 0) {
        ctx.fillStyle = 'rgba(244,243,239,0.34)';
        ctx.font = `400 32px ${FONT_SANS}`;
        ctx.fillText('等待第一个 Token…', left, top + 12);
      } else {
        ctx.fillStyle = '#f1efe8';
        ctx.font = `400 36px ${FONT_SANS}`;
        const lines = wrapChineseText(ctx, text, maxWidth);
        let y = top;
        for (const line of lines.slice(0, 8)) {
          ctx.fillText(line, left, y);
          y += 58;
        }
        if (state.visibleTokens < 55) {
          const lastLine = lines[lines.length - 1] ?? '';
          const cursorX = left + ctx.measureText(lastLine).width + 5;
          const cursorY = top + Math.max(0, Math.min(7, lines.length - 1)) * 58;
          ctx.fillStyle = '#e4572a';
          ctx.fillRect(cursorX, cursorY + 5, 3, 36);
        }
      }

      ctx.fillStyle = 'rgba(139,207,194,0.56)';
      ctx.font = `400 17px ${FONT_MONO}`;
      ctx.fillText('SSE · text/event-stream · incremental render', left, 758);
    } else {
      ctx.fillStyle = 'rgba(244,243,239,0.28)';
      ctx.font = `400 32px ${FONT_SANS}`;
      ctx.fillText('上下文已离开客户端，等待流式响应。', left, top + 12);
    }
  }

  private drawComposer(state: ChatScreenState): void {
    const ctx = this.context;
    const x = 64;
    const y = 814;
    const width = WIDTH - 128;
    const height = 88;
    ctx.strokeStyle = 'rgba(244,243,239,0.14)';
    ctx.lineWidth = 1;
    roundedRect(ctx, x, y, width, height, 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(244,243,239,0.26)';
    ctx.font = `400 27px ${FONT_SANS}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(state.phase === 'landing' ? '写下你的问题…' : '继续对话…', x + 28, y + height / 2);

    ctx.fillStyle = '#e4572a';
    ctx.beginPath();
    ctx.arc(WIDTH - x - 46, y + height / 2, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f4f3ef';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH - x - 56, y + height / 2);
    ctx.lineTo(WIDTH - x - 38, y + height / 2);
    ctx.moveTo(WIDTH - x - 45, y + height / 2 - 8);
    ctx.lineTo(WIDTH - x - 37, y + height / 2);
    ctx.moveTo(WIDTH - x - 45, y + height / 2 + 8);
    ctx.lineTo(WIDTH - x - 37, y + height / 2);
    ctx.stroke();
  }

  private drawFooter(state: ChatScreenState): void {
    const ctx = this.context;
    ctx.strokeStyle = 'rgba(244,243,239,0.08)';
    ctx.beginPath();
    ctx.moveTo(64, 938);
    ctx.lineTo(WIDTH - 64, 938);
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.font = `400 16px ${FONT_MONO}`;
    ctx.fillStyle = 'rgba(244,243,239,0.26)';
    ctx.fillText('SIMULATED CLIENT · NO REAL MODEL CALL', 64, 965);

    ctx.textAlign = 'right';
    ctx.fillStyle = state.clientMode === 'api' ? '#e4572a' : 'rgba(244,243,239,0.4)';
    ctx.fillText(state.clientMode === 'api' ? 'API VIEW' : 'WEB VIEW', WIDTH - 64, 965);
    ctx.textAlign = 'left';
  }

  dispose(): void {
    this.texture.dispose();
  }
}

function wrapChineseText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const character of [...text]) {
    if (character === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const candidate = line + character;
    if (context.measureText(candidate).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export { WIDTH as SCREEN_WIDTH, HEIGHT as SCREEN_HEIGHT };
