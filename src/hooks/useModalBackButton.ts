import { useEffect, useRef } from 'react';

/**
 * A custom hook that intercepts the mobile hardware back button.
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  // Store the latest onClose callback to avoid stale closures without triggering re-effects
  const onCloseRef = useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // 1. Trap the back button by pushing a new state to the history stack
      window.history.pushState({ modalOpen: true }, '');

      // 2. Listen for the hardware back button press (which pops the state)
      const handlePopState = () => {
        onCloseRef.current();
      };

      window.addEventListener('popstate', handlePopState);

      // 3. Cleanup logic
      return () => {
        window.removeEventListener('popstate', handlePopState);
        
        // If the modal was closed manually via the UI (not the hardware back button),
        // the trapped state is still sitting in the history stack. We must pop it.
        if (window.history.state?.modalOpen) {
          window.history.back();
        }
      };
    }
  }, [isOpen]); // DO NOT include onClose here, it causes history API rate limit crashes!
}
