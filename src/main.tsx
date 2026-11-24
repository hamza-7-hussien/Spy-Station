import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary';
import './index.css';

// Purge any legacy caches
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      if (key.startsWith('spy-station-v1') || key === 'spy-station-cache') {
        caches.delete(key);
      }
    });
  });
}

// Prevent mobile virtual keyboard from panning window or leaving a white bar
function setupMobileKeyboardViewport() {
  const root = document.documentElement;
  let baselineHeight = window.innerHeight;

  const resetWindowScroll = () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
    if (document.documentElement.scrollTop !== 0) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body && document.body.scrollTop !== 0) {
      document.body.scrollTop = 0;
    }
  };

  const syncViewportHeight = () => {
    const vv = window.visualViewport;
    if (!vv) {
      root.style.setProperty('--app-height', `${window.innerHeight}px`);
      resetWindowScroll();
      return;
    }

    // Track largest height when keyboard is closed
    if (vv.height > baselineHeight) {
      baselineHeight = vv.height;
    }

    const active = document.activeElement;
    const isInputFocused =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);

    // If visual viewport is noticeably smaller than layout innerHeight (e.g. iOS / WebView without resizes-content),
    // shrink #root strictly to vv.height so nothing overflows behind the keyboard or causes a white bar.
    if (vv.height < window.innerHeight - 20 || (isInputFocused && vv.height < baselineHeight - 80)) {
      root.style.setProperty('--app-height', `${Math.round(vv.height)}px`);
    } else {
      root.style.setProperty('--app-height', '100%');
    }

    resetWindowScroll();
  };

  syncViewportHeight();

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewportHeight, { passive: true });
    window.visualViewport.addEventListener('scroll', resetWindowScroll, { passive: true });
  }
  window.addEventListener('resize', syncViewportHeight, { passive: true });
  window.addEventListener('scroll', resetWindowScroll, { passive: true });

  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      setTimeout(() => {
        syncViewportHeight();
        try {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        } catch {
          // ignore
        }
        resetWindowScroll();
      }, 180);
    }
  });

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      syncViewportHeight();
      resetWindowScroll();
    }, 120);
  });
}

setupMobileKeyboardViewport();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
