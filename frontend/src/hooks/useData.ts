import { useState, useEffect, useRef } from "react";

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export const useData = <T>(filename: string) => {
  const [data, setData] = useState<T | null>(
    (cache.get(filename) as T) ?? null,
  );
  const [loading, setLoading] = useState(!cache.has(filename));
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (cache.has(filename)) {
      setData(cache.get(filename) as T);
      setLoading(false);
      return;
    }

    let existing = inflight.get(filename);
    if (!existing) {
      existing = fetch(`/data/${filename}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          cache.set(filename, json);
          inflight.delete(filename);
          return json;
        })
        .catch((err) => {
          inflight.delete(filename);
          throw err;
        });
      inflight.set(filename, existing);
    }

    existing
      .then((json) => {
        if (mounted.current) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted.current) {
          setError(err.message);
          setLoading(false);
        }
      });
  }, [filename]);

  const retry = () => {
    cache.delete(filename);
    inflight.delete(filename);
    setLoading(true);
    setError(null);

    fetch(`/data/${filename}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        cache.set(filename, json);
        if (mounted.current) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted.current) {
          setError(err.message);
          setLoading(false);
        }
      });
  };

  return { data, loading, error, retry };
};
