import { useEffect, useState } from 'react';
import { assetUrl } from './cn';

const cache = new Map();

// Fetch a JSON file from the site's public root (base-path aware), with a tiny cache.
export function useData(file) {
  const [state, setState] = useState(() => ({
    data: cache.get(file) || null,
    error: null,
    loading: !cache.has(file),
  }));

  useEffect(() => {
    if (cache.has(file)) {
      setState({ data: cache.get(file), error: null, loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetch(assetUrl(file), { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        cache.set(file, data);
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (alive) setState({ data: null, error, loading: false });
      });
    return () => {
      alive = false;
    };
  }, [file]);

  return state;
}
