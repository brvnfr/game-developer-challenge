import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import { App } from '@/app/App';
import { createBrowserServices } from '@/app/AppServices';
import { installTestHarness } from '@/testing/TestHarness';
import { readTestMode } from '@/testing/testMode';
import '@/app/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

if (readTestMode().isEnabled) installTestHarness();

createRoot(container).render(
  <StrictMode>
    <App services={createBrowserServices()} />
  </StrictMode>,
);
