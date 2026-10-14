/** Element ids that link a tab to its panel (aria-controls / aria-labelledby). */
export const tabId = (idPrefix: string, id: string) => `${idPrefix}-tab-${id}`;
export const tabPanelId = (idPrefix: string, id: string) => `${idPrefix}-panel-${id}`;
