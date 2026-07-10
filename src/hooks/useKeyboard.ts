import { useHotkeys } from 'react-hotkeys-hook';
import { useEffect, useRef } from 'react';

interface KeyboardHandlers {
  onSave?: () => void;
  onOpen?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers) {
  const handlersRef = useRef(handlers);
  
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useHotkeys('ctrl+s, meta+s', (e) => {
    e.preventDefault();
    handlersRef.current.onSave?.();
  });

  useHotkeys('ctrl+o, meta+o', (e) => {
    e.preventDefault();
    handlersRef.current.onOpen?.();
  });

  useHotkeys('ctrl+z, meta+z', (e) => {
    e.preventDefault();
    handlersRef.current.onUndo?.();
  });

  useHotkeys('ctrl+shift+z, meta+shift+z', (e) => {
    e.preventDefault();
    handlersRef.current.onRedo?.();
  });

  useHotkeys('ctrl+f, meta+f', (e) => {
    e.preventDefault();
    handlersRef.current.onFind?.();
  });

  useHotkeys('ctrl+=, meta+=, ctrl+num_add, meta+num_add', (e) => {
    e.preventDefault();
    handlersRef.current.onZoomIn?.();
  });

  useHotkeys('ctrl+-, meta+-, ctrl+num_subtract, meta+num_subtract', (e) => {
    e.preventDefault();
    handlersRef.current.onZoomOut?.();
  });
  
  useHotkeys('right, pagedown', (e) => {
    e.preventDefault();
    handlersRef.current.onNextPage?.();
  });
  
  useHotkeys('left, pageup', (e) => {
    e.preventDefault();
    handlersRef.current.onPrevPage?.();
  });
}
