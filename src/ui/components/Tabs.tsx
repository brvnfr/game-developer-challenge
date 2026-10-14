import { useRef, type KeyboardEvent } from 'react';
import { tabId, tabPanelId } from './tabIds';

export interface TabDefinition<Id extends string> {
  readonly id: Id;
  readonly label: string;
}

interface TabsProps<Id extends string> {
  readonly label: string;
  readonly tabs: readonly TabDefinition<Id>[];
  readonly selectedId: Id;
  readonly onSelect: (id: Id) => void;
  /** Prefix for the tab and panel element ids (`${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}`). */
  readonly idPrefix: string;
}

/**
 * WAI-ARIA tabs with automatic activation: only the selected tab is in the Tab order; arrow keys, Home and End
 * move between tabs. The selected tab looks like the primary plank button, the others like the dark one.
 */
export function Tabs<Id extends string>({ label, tabs, selectedId, onSelect, idPrefix }: TabsProps<Id>) {
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>());

  const selectAt = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    onSelect(tab.id);
    tabRefs.current.get(tab.id)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectAt(target);
  };

  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((tab, index) => {
        const isSelected = tab.id === selectedId;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.id, element);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={isSelected}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            tabIndex={isSelected ? 0 : -1}
            className={isSelected ? 'tab tab--selected' : 'tab'}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
