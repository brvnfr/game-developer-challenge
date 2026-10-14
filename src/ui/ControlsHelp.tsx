import { GAME_ACTIONS, KEY_BINDINGS } from '@/game/input/keyBindings';

/** Control instructions, generated from the same key-binding table the game uses. */
export function ControlsHelp() {
  const actions = [...GAME_ACTIONS, 'togglePause'] as const;
  return (
    <section className="controls-help" aria-labelledby="controls-help-title">
      <h2 id="controls-help-title" className="controls-help__title">
        Controls
      </h2>
      <dl className="controls-help__list">
        {actions.map((action) => (
          <div key={action} className="controls-help__row">
            <dt>
              {KEY_BINDINGS[action].keyLabels.map((label) => (
                <kbd key={label}>{label}</kbd>
              ))}
            </dt>
            <dd>{KEY_BINDINGS[action].description}</dd>
          </div>
        ))}
      </dl>
      <p className="controls-help__touch">
        On touch screens, use the on-screen buttons: steering on the left, cannons on the right.
      </p>
    </section>
  );
}
