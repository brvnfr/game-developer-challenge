import { useId, useRef, useState, type FormEvent } from 'react';
import { NETWORK_SCENARIOS, isNetworkScenarioId, type NetworkScenarioId } from '@/mocks/scenarios';
import type { MockServer } from '@/mocks/MockServer';
import { remoteKeys } from '@/remote/queryKeys';
import { useRemoteServices } from '@/remote/remoteServicesContext';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';

interface NetworkScenariosDialogProps {
  readonly mockServer: MockServer;
  readonly onClose: () => void;
}

/**
 * Demo and test control of the simulated backend: choose a network scenario (with a seed for reproducible
 * delays), or restore the initial state (fixtures only, Success scenario).
 */
export function NetworkScenariosDialog({ mockServer, onClose }: NetworkScenariosDialogProps) {
  const { queryClient, registrar } = useRemoteServices();
  const initial = mockServer.scenarios.settings;
  const [scenarioId, setScenarioId] = useState<NetworkScenarioId>(initial.scenarioId);
  const [seed, setSeed] = useState(String(initial.seed));
  const [latency, setLatency] = useState(String(initial.baseLatencyMs));
  const [message, setMessage] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);
  const ids = { scenario: useId(), description: useId(), seed: useId(), latency: useId() };
  const description = NETWORK_SCENARIOS.find((scenario) => scenario.id === scenarioId)?.description ?? '';

  const refreshEverything = () => {
    void queryClient.invalidateQueries({ queryKey: remoteKeys.all });
    registrar.retryAll();
  };

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const seedValue = Number(seed);
    const latencyValue = Number(latency);
    if (!Number.isInteger(seedValue) || !Number.isInteger(latencyValue) || latencyValue < 0 || latencyValue > 10_000) {
      setMessage('Seed must be a whole number and latency between 0 and 10000 ms.');
      return;
    }
    mockServer.scenarios.select({ scenarioId, seed: seedValue, baseLatencyMs: latencyValue });
    refreshEverything();
    const label = NETWORK_SCENARIOS.find((scenario) => scenario.id === scenarioId)?.label ?? scenarioId;
    setMessage(`Scenario applied: ${label}.`);
  };

  const reset = () => {
    mockServer.resetAll();
    const settings = mockServer.scenarios.settings;
    setScenarioId(settings.scenarioId);
    setSeed(String(settings.seed));
    setLatency(String(settings.baseLatencyMs));
    refreshEverything();
    setMessage('Mock server reset: only the fixtures remain and the Success scenario is selected.');
  };

  return (
    <Dialog
      title="Network scenarios"
      description="Simulate how the ranking and history server behaves. The game itself never depends on it."
      initialFocusRef={selectRef}
      onEscape={onClose}
      className="network-dialog"
    >
      <form className="form network-dialog__form" noValidate onSubmit={apply}>
        <div className="field">
          <label htmlFor={ids.scenario} className="field__label">
            Scenario
          </label>
          <select
            ref={selectRef}
            id={ids.scenario}
            className="field__input"
            value={scenarioId}
            aria-describedby={ids.description}
            onChange={(event) => {
              if (isNetworkScenarioId(event.target.value)) setScenarioId(event.target.value);
            }}
          >
            {NETWORK_SCENARIOS.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
          <p id={ids.description} className="field__hint">
            {description}
          </p>
        </div>
        <div className="network-dialog__numbers">
          <div className="field">
            <label htmlFor={ids.seed} className="field__label">
              Seed
            </label>
            <input
              id={ids.seed}
              className="field__input"
              inputMode="numeric"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.latency} className="field__label">
              Base latency (ms)
            </label>
            <input
              id={ids.latency}
              className="field__input"
              inputMode="numeric"
              value={latency}
              onChange={(event) => setLatency(event.target.value)}
            />
          </div>
        </div>
        <p role="status" className="form-status">
          {message}
        </p>
        <div className="form__actions">
          <Button type="submit">Apply</Button>
          <Button variant="small" onClick={reset}>
            Reset mock server
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
