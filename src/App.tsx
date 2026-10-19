import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './styles/global.css';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { EditorView } from './pages/EditorView';
import { ToastContainer } from './components/Common/Toast';
import { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { invoke } from '@tauri-apps/api/tauri';

function App() {
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mantine-color-scheme', theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const args: string[] = await invoke('get_cli_args');
        const cleanArg = (p: string) => p.replace(/^["']|["']$/g, '').trim();
        const candidate = args.slice(1).map(cleanArg).find(a => a.toLowerCase().endsWith('.pdf'));
        if (candidate) {
          useUIStore.getState().setPendingFilePath(candidate);
        }
      } catch (e) {
        console.error("Failed to retrieve CLI args:", e);
      }
    })();
  }, []);

  return (
    <MantineProvider forceColorScheme={theme as 'light' | 'dark'}>
      <ErrorBoundary>
        <EditorView />
        <ToastContainer />
      </ErrorBoundary>
    </MantineProvider>
  );
}

export default App;
