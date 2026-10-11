import { useEffect } from 'react';

let lockCount = 0;
let prevBodyOverflow = '';
let prevHtmlOverflow = '';

/**
 * Custom hook to lock background scrolling when a modal or drawer is open.
 * Guarantees that on desktop/laptop (mouse wheel / trackpad) and mobile (touch),
 * the page behind the modal stays completely static while the modal content scrolls.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    if (lockCount === 0) {
      prevBodyOverflow = document.body.style.overflow;
      prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    lockCount++;

    const handleWheelOnBackdrop = (e: WheelEvent) => {
      // If cursor is outside any scrollable container inside modal, prevent wheel scrolling
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.overflow-y-auto, .overflow-auto, [data-scrollable="true"]')) {
        e.preventDefault();
      }
    };

    const handleTouchOnBackdrop = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.overflow-y-auto, .overflow-auto, [data-scrollable="true"]')) {
        if (e.cancelable) e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheelOnBackdrop, { passive: false });
    window.addEventListener('touchmove', handleTouchOnBackdrop, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheelOnBackdrop);
      window.removeEventListener('touchmove', handleTouchOnBackdrop);
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      }
    };
  }, [isLocked]);
}
