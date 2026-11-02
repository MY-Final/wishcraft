import { positionAt, progressAtStage, STAGES, TOTAL_DURATION, type StagePosition } from '../data/journey';

export type PlaybackSpeed = 0.5 | 1 | 2;

export class JourneyClock {
  progress = 0;
  playing = false;
  speed: PlaybackSpeed = 1;
  private completedFlag = false;

  begin(): void {
    this.progress = 0;
    this.completedFlag = false;
    this.playing = true;
  }

  play(): void {
    if (this.progress >= 1) this.progress = 0;
    this.completedFlag = false;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  advance(deltaSeconds: number): void {
    if (!this.playing) return;
    const dt = Math.min(0.05, Math.max(0, deltaSeconds));
    this.progress = Math.min(1, this.progress + (dt * this.speed) / TOTAL_DURATION);
    if (this.progress >= 1) {
      this.progress = 1;
      this.playing = false;
      this.completedFlag = true;
    }
  }

  seekProgress(progress: number): void {
    this.progress = Math.min(1, Math.max(0, progress));
    this.completedFlag = this.progress >= 1;
  }

  seekStage(index: number): void {
    this.seekProgress(progressAtStage(index));
    this.completedFlag = false;
  }

  seekSeconds(seconds: number): void {
    this.seekProgress(seconds / TOTAL_DURATION);
  }

  nextStage(): void {
    const position = this.position;
    if (position.index >= STAGES.length - 1) {
      this.seekProgress(1);
      this.playing = false;
      return;
    }
    this.seekStage(position.index + 1);
  }

  previousStage(): void {
    const position = this.position;
    if (position.localProgress > 0.08) {
      this.seekStage(position.index);
      return;
    }
    this.seekStage(Math.max(0, position.index - 1));
  }

  get position(): StagePosition {
    return positionAt(this.progress);
  }

  get completed(): boolean {
    return this.completedFlag || this.progress >= 1;
  }

  get elapsedSeconds(): number {
    return this.progress * TOTAL_DURATION;
  }

  get remainingSeconds(): number {
    return (1 - this.progress) * TOTAL_DURATION;
  }
}
