import { useEffect, useRef } from 'react';

/**
 * Adds `is-visible` the first time an element's top enters the viewport (CSS class `reveal`).
 * Uses a margin, not a share of the element, so very tall sections still reveal on phones.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/**
 * Scrolls to a section, stopping below the app's sticky header. It glides unless the student has
 * asked their device for reduced motion.
 */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - 76,
    behavior: calm ? 'auto' : 'smooth',
  });
}
