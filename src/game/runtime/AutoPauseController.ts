import type { PauseReason } from '@/game/sim/events/GameEvent';

type EventSource = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export interface AutoPauseTargets {
  readonly window: EventSource;
  readonly document: EventSource & { readonly visibilityState: DocumentVisibilityState };
}

/**
 * Pauses the match when the window loses focus or the tab is hidden. It never resumes on its own:
 * resuming always requires an explicit player action.
 */
export class AutoPauseController {
  private attached = false;

  constructor(
    private readonly targets: AutoPauseTargets,
    private readonly pause: (reason: PauseReason) => void,
  ) {}

  get isAttached(): boolean {
    return this.attached;
  }

  attach(): void {
    if (this.attached) return;
    this.targets.window.addEventListener('blur', this.handleBlur);
    this.targets.document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    this.targets.window.removeEventListener('blur', this.handleBlur);
    this.targets.document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.attached = false;
  }

  private readonly handleBlur = (): void => {
    this.pause('blur');
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.targets.document.visibilityState === 'hidden') this.pause('hidden');
  };
}
