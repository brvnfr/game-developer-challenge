import { Container } from 'pixi.js';
import type { TimedEffect } from './TimedEffect';

/** Owns the transient effects: adds them to the scene, advances them and frees them when finished. */
export class EffectsLayer {
  readonly container = new Container({ label: 'effects' });
  private readonly effects: TimedEffect[] = [];

  get activeCount(): number {
    return this.effects.length;
  }

  add(effect: TimedEffect): void {
    this.effects.push(effect);
    this.container.addChild(effect.displayObject);
  }

  update(deltaSeconds: number): void {
    for (let index = this.effects.length - 1; index >= 0; index--) {
      const effect = this.effects[index];
      if (effect && !effect.update(deltaSeconds)) {
        effect.destroy();
        this.effects.splice(index, 1);
      }
    }
  }

  clear(): void {
    for (const effect of this.effects) effect.destroy();
    this.effects.length = 0;
  }

  destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }
}
