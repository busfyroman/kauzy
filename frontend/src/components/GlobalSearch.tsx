import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  User,
  Building2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Fuse from "fuse.js";
import { useData } from "@/hooks/useData";
import type { SearchEntry } from "@/types";
import { getTypeColor } from "@/utils/format";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const typeIcons = {
  politician: User,
  company: Building2,
  kauza: AlertTriangle,
  zakazka: FileText,
};

const typeRoutes: Record<string, (id: string) => string> = {
  politician: (rawId) => `/politik/${rawId.replace("p-", "")}`,
  company: () => `/zakazky`,
  kauza: () => `/kauzy`,
  zakazka: () => `/zakazky`,
};

export const GlobalSearch = ({ open, onClose }: GlobalSearchProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: searchIndex } = useData<SearchEntry[]>("search_index.json");

  const fuse = useMemo(() => {
    if (!searchIndex) return null;
    return new Fuse(searchIndex, {
      keys: ["label", "keywords", "sublabel"],
      threshold: 0.3,
    });
  }, [searchIndex]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) return [];
    return fuse.search(query.trim()).map((r) => r.item);
  }, [fuse, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (entry: SearchEntry) => {
    const route = typeRoutes[entry.type]?.(entry.id) || "/";
    navigate(route);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh]"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border-custom bg-surface shadow-2xl .light:border-border-light .light:bg-surface-light"
          >
            <div className="flex items-center gap-3 border-b border-border-custom px-4 .light:border-border-light">
              <Search size={18} className="text-text-secondary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("search.placeholder")}
                className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-text-secondary"
              />
              <button onClick={onClose} className="rounded p-1 hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            {query.trim() && (
              <div className="max-h-80 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="p-4 text-center text-sm text-text-secondary">
                    {t("search.noResults")}
                  </p>
                ) : (
                  results.map((entry, i) => {
                    const Icon = typeIcons[entry.type] || User;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleSelect(entry)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          i === selectedIndex
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <Icon size={16} className={getTypeColor(entry.type)} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {entry.label}
                          </div>
                          {entry.sublabel && (
                            <div className="truncate text-xs text-text-secondary">
                              {entry.sublabel}
                            </div>
                          )}
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${getTypeColor(entry.type)} bg-white/5`}
                        >
                          {entry.type}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
