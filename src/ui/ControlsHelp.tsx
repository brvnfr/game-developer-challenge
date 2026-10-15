import { GAME_ACTIONS, KEY_BINDINGS } from '@/game/input/keyBindings';

/**
 * Control instructions, generated from the same key-binding table the game uses. `withTitle` is off inside the
 * Controls dialog, whose own title names it.
 */
export function ControlsHelp({ withTitle = true }: { readonly withTitle?: boolean }) {
  const actions = [...GAME_ACTIONS, 'togglePause'] as const;
  return (
    <section className="controls-help" aria-labelledby={withTitle ? 'controls-help-title' : undefined}>
      {withTitle && (
        <h2 id="controls-help-title" className="controls-help__title">
          Controls
        </h2>
      )}
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
        On touch screens, drag the helm on the left to steer and sail; the cannon buttons are on the right.
      </p>
    </section>
  );
}
