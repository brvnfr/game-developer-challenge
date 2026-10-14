import { useRef, useState, type FormEvent } from 'react';
import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import { SETTINGS_RULES, validateSettings, type SettingsField } from '@/game/config/settingsValidation';
import type { UserSettings } from '@/game/config/types';
import { PLAYER_NAME_MAX_LENGTH, validatePlayerName } from '@/profile/playerName';
import { Button } from '@/ui/components/Button';
import { MenuLayout } from '@/ui/components/MenuLayout';
import { NumberStepper } from '@/ui/components/NumberStepper';
import { TextField } from '@/ui/components/TextField';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import { canStepSettingValue, formatSettingValue, stepSettingValue } from './settingsStepping';

/** Outcome reported by the owner of the saved options. */
export type OptionsSaveOutcome = 'saved' | 'notPersisted';

interface OptionsScreenProps {
  readonly savedSettings: UserSettings;
  readonly savedCaptainName: string;
  readonly onSave: (settings: UserSettings, captainName: string) => OptionsSaveOutcome;
  readonly onMainMenu: () => void;
}

type SaveStatus = 'idle' | 'saved' | 'invalid' | 'notPersisted';

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saved: 'Options saved. They apply from your next match.',
  invalid: 'Fix the highlighted fields before saving.',
  notPersisted: 'Options apply to this visit, but this browser could not store them.',
};

const SETTING_FIELDS: readonly SettingsField[] = ['sessionTimeSeconds', 'spawnIntervalSeconds'];

function rangeHint(field: SettingsField): string {
  const rule = SETTINGS_RULES[field];
  const steps = rule.increment === 1 ? 'whole seconds' : `steps of ${formatSettingValue(rule.increment)} s`;
  return `${rule.minimum}–${rule.maximum} seconds, ${steps}.`;
}

function toFieldTexts(settings: UserSettings): Record<SettingsField, string> {
  return {
    sessionTimeSeconds: formatSettingValue(settings.sessionTimeSeconds),
    spawnIntervalSeconds: formatSettingValue(settings.spawnIntervalSeconds),
  };
}

/**
 * Options: Game session time, Enemy spawn time and the captain name. Values are validated as they are typed;
 * Save persists them and each new match takes a snapshot, so a running match is never affected.
 */
export function OptionsScreen({ savedSettings, savedCaptainName, onSave, onMainMenu }: OptionsScreenProps) {
  const [fieldTexts, setFieldTexts] = useState(() => toFieldTexts(savedSettings));
  const [captainName, setCaptainName] = useState(savedCaptainName);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const firstFieldRef = useFocusOnMount<HTMLInputElement>();
  const spawnFieldRef = useRef<HTMLInputElement>(null);
  const nameFieldRef = useRef<HTMLInputElement>(null);

  const settingsValidation = validateSettings(fieldTexts);
  const settingsErrors = settingsValidation.isValid ? {} : settingsValidation.errors;
  const nameValidation = validatePlayerName(captainName);
  const nameError = nameValidation.isValid ? undefined : nameValidation.error;
  const hasUnsavedChanges =
    !settingsValidation.isValid ||
    settingsValidation.settings.sessionTimeSeconds !== savedSettings.sessionTimeSeconds ||
    settingsValidation.settings.spawnIntervalSeconds !== savedSettings.spawnIntervalSeconds ||
    !nameValidation.isValid ||
    nameValidation.name !== savedCaptainName;

  const updateField = (field: SettingsField, text: string) => {
    setFieldTexts((current) => ({ ...current, [field]: text }));
    setStatus('idle');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settingsValidation.isValid || !nameValidation.isValid) {
      setStatus('invalid');
      const firstInvalid = settingsErrors.sessionTimeSeconds
        ? firstFieldRef
        : settingsErrors.spawnIntervalSeconds
          ? spawnFieldRef
          : nameFieldRef;
      firstInvalid.current?.focus();
      return;
    }
    setFieldTexts(toFieldTexts(settingsValidation.settings));
    setCaptainName(nameValidation.name);
    setStatus(onSave(settingsValidation.settings, nameValidation.name));
  };

  return (
    <MenuLayout labelledBy="options-title" className="options-panel">
      <h1 id="options-title" className="panel__title">
        Options
      </h1>
      <form className="form" noValidate onSubmit={handleSubmit} aria-labelledby="options-title">
        {SETTING_FIELDS.map((field) => {
          const rule = SETTINGS_RULES[field];
          const text = fieldTexts[field];
          return (
            <NumberStepper
              key={field}
              name={field}
              inputRef={field === 'sessionTimeSeconds' ? firstFieldRef : spawnFieldRef}
              label={rule.label}
              value={text}
              unit="s"
              hint={rangeHint(field)}
              error={settingsErrors[field]}
              canDecrease={canStepSettingValue(text, -1, rule)}
              canIncrease={canStepSettingValue(text, 1, rule)}
              onChange={(value) => updateField(field, value)}
              onStep={(direction) => updateField(field, stepSettingValue(text, direction, rule))}
            />
          );
        })}
        <TextField
          name="captainName"
          inputRef={nameFieldRef}
          label="Captain name"
          value={captainName}
          maxLength={PLAYER_NAME_MAX_LENGTH + 10}
          hint={`Shown in the ranking. Up to ${PLAYER_NAME_MAX_LENGTH} characters.`}
          error={nameError}
          onChange={(value) => {
            setCaptainName(value);
            setStatus('idle');
          }}
        />
        <p
          role="status"
          className={
            status === 'invalid' || status === 'notPersisted' ? 'form-status form-status--error' : 'form-status'
          }
        >
          {status === 'idle' && hasUnsavedChanges ? 'You have unsaved changes.' : STATUS_TEXT[status]}
        </p>
        <div className="form__actions">
          <Button type="submit">Save</Button>
          <Button
            variant="small"
            onClick={() => {
              setFieldTexts(toFieldTexts(DEFAULT_USER_SETTINGS));
              setStatus('idle');
            }}
          >
            Reset defaults
          </Button>
          <Button variant="secondary" onClick={onMainMenu}>
            Main Menu
          </Button>
        </div>
      </form>
    </MenuLayout>
  );
}
