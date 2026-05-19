import {
  Component,
  computed,
  EventEmitter,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface RecordedBlob {
  blob: Blob;
  durationSec: number;
  mimeType: string;
}

@Component({
  selector: 'app-voice-recorder',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="bg-slate-50 border border-slate-200 rounded p-4">
      <div class="flex items-center gap-3 mb-2">
        @if (!recording() && !blob()) {
          <button
            (click)="start()"
            class="bg-rose-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl"
            aria-label="Start recording"
          >
            ●
          </button>
          <span class="text-sm text-slate-600"
            >Tap to record (max {{ maxSeconds }}s)</span
          >
        }
        @if (recording()) {
          <button
            (click)="stop()"
            class="bg-slate-900 text-white rounded-full w-12 h-12 flex items-center justify-center"
            aria-label="Stop recording"
          >
            ■
          </button>
          <span class="text-sm font-mono"
            >{{ elapsed() | number: '1.0-0' }}s · recording…</span
          >
        }
        @if (blob() && !recording()) {
          <audio controls [src]="previewUrl()" class="flex-1"></audio>
          <button
            (click)="redo()"
            class="text-sm text-slate-500 hover:underline"
          >
            Re-record
          </button>
        }
      </div>
      @if (error()) {
        <p class="text-sm text-rose-600">{{ error() }}</p>
      }
    </div>
  `,
})
export class VoiceRecorderComponent implements OnDestroy {
  @Output() readonly recorded = new EventEmitter<RecordedBlob>();

  readonly maxSeconds = 60;

  protected readonly recording = signal(false);
  protected readonly elapsed = signal(0);
  protected readonly blob = signal<Blob | null>(null);
  protected readonly previewUrl = computed(() =>
    this.blob() ? URL.createObjectURL(this.blob()!) : '',
  );
  protected readonly error = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.error.set(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      this.error.set('Recording is not supported in this browser');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        this.stream,
        mimeType ? { mimeType } : undefined,
      );
      this.chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data);
      };
      recorder.onstop = () => {
        const finalMime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: finalMime });
        const durationSec = (Date.now() - this.startedAt) / 1000;
        this.blob.set(blob);
        this.recorded.emit({ blob, durationSec, mimeType: finalMime });
        this.cleanupStream();
      };
      recorder.start();
      this.mediaRecorder = recorder;
      this.startedAt = Date.now();
      this.recording.set(true);
      this.elapsed.set(0);
      this.tickHandle = setInterval(() => {
        const e = (Date.now() - this.startedAt) / 1000;
        this.elapsed.set(e);
        if (e >= this.maxSeconds) this.stop();
      }, 250);
    } catch (err) {
      this.error.set((err as Error).message);
      this.cleanupStream();
    }
  }

  stop(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
    this.mediaRecorder?.stop();
    this.recording.set(false);
  }

  redo(): void {
    this.blob.set(null);
    this.elapsed.set(0);
  }

  ngOnDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.cleanupStream();
  }

  private cleanupStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

function pickMimeType(): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}
