import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Search, Sun, Moon, Languages } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { GlobalSearch } from "./GlobalSearch";

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleLang = useCallback(() => {
    const next = i18n.language === "sk" ? "en" : "sk";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  }, [i18n]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border-custom bg-surface px-4 .light:border-border-light .light:bg-surface-light">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="rounded-md p-1.5 hover:bg-white/10 md:hidden"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border-custom bg-white/5 px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-white/10 .light:border-border-light .light:bg-black/5"
          >
            <Search size={14} />
            <span className="hidden sm:inline">{t("search.placeholder")}</span>
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-xs sm:inline">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={toggleLang}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-white/10"
            title={i18n.language === "sk" ? "Switch to English" : "Prepnúť na slovenčinu"}
          >
            <Languages size={16} />
            <span className="text-xs font-medium uppercase">
              {i18n.language}
            </span>
          </button>

          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 hover:bg-white/10"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
