import { useEffect, useState } from 'react';

/** The value, once it has stopped changing for `ms` (e.g. while a student drags a slider). */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
