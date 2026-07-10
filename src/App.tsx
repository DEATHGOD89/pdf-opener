import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './styles/global.css';
import { ErrorBoundary } from './components/Common/ErrorBoundary';

import { Dashboard } from './pages/Dashboard';
import { EditorView } from './pages/EditorView';
import { MergePDF } from './pages/MergePDF';
import { SplitPDF } from './pages/SplitPDF';
import { RotatePDF } from './pages/RotatePDF';
import { ToastContainer } from './components/Common/Toast';
import { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { invoke } from '@tauri-apps/api/tauri';

function App() {
  const { theme } = useUIStore();

  useEffect(() => {
    (async () => {
      try {
        const args: string[] = await invoke('get_cli_args');
        const filePath = args.length > 1 ? args[1] : null;
        if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
          useUIStore.getState().setPendingFilePath(filePath);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Navigate to editor if a file was passed via CLI
  useEffect(() => {
    const pending = useUIStore.getState().pendingFilePath;
    if (pending) {
      window.location.hash = '#/editor';
    }
  });

  return (
    <MantineProvider forceColorScheme={theme as 'light' | 'dark'}>
      <ErrorBoundary>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/editor" component={EditorView} />
            <Route path="/merge" component={MergePDF} />
            <Route path="/split" component={SplitPDF} />
            <Route path="/rotate" component={RotatePDF} />
            <Route>{() => <Dashboard />}</Route>
          </Switch>
          <ToastContainer />
        </Router>
      </ErrorBoundary>
    </MantineProvider>
  );
}

export default App;
