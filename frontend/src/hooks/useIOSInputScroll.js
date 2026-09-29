import { useEffect, useRef } from 'react';

export const useIOSInputScroll = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    // Apply on mobile, tablet, and responsive screens where virtual keyboard appears
    const isMobileOrTouch = 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      window.innerWidth <= 768;

    if (!isMobileOrTouch) return;

    const isInputElement = (el) => {
      if (!el) return false;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    };

    const markKeyboardOpen = () => {
      document.body.classList.add('keyboard-open');
      document.body.setAttribute('data-keyboard-open', 'true');
    };

    const markKeyboardClosed = () => {
      document.body.classList.remove('keyboard-open');
      document.body.removeAttribute('data-keyboard-open');
    };

    const handleFocus = (e) => {
      const target = e.target;
      if (isInputElement(target)) {
        clearTimeout(timerRef.current);
        markKeyboardOpen();
        
        // Scroll INPUT and TEXTAREA smoothly into view
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          timerRef.current = setTimeout(() => {
            if (document.activeElement === target) {
              target.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }
          }, 300);
        }
      }
    };

    const handleBlur = (e) => {
      const target = e.target;
      if (isInputElement(target)) {
        clearTimeout(timerRef.current);
        // Short timeout to verify if focus shifted to another input/select or is truly closed
        timerRef.current = setTimeout(() => {
          const activeEl = document.activeElement;
          if (activeEl && isInputElement(activeEl)) {
            return;
          }
          markKeyboardClosed();
        }, 200);
      }
    };

    // Monitor visualViewport for keyboard show/hide
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        if (heightDiff > 150) {
          markKeyboardOpen();
        } else if (!isInputElement(document.activeElement)) {
          markKeyboardClosed();
        }
      }
    };

    // Use capture phase to catch all focus events reliably
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      markKeyboardClosed();
      clearTimeout(timerRef.current);
    };
  }, []);
};
