import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Landmark,
  Building2,
  AlertTriangle,
  FileText,
  GitFork,
  Info,
  Gamepad2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { path: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { path: "/vlada", icon: Landmark, labelKey: "nav.vlada" },
  { path: "/parlament", icon: Building2, labelKey: "nav.parlament" },
  { path: "/kauzy", icon: AlertTriangle, labelKey: "nav.kauzy" },
  { path: "/zakazky", icon: FileText, labelKey: "nav.zakazky" },
  { path: "/graf", icon: GitFork, labelKey: "nav.graf" },
  { path: "/hra", icon: Gamepad2, labelKey: "nav.game" },
  { path: "/about", icon: Info, labelKey: "nav.about" },
];

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { t } = useTranslation();

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onClose}
          end={item.path === "/"}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/20 text-primary"
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            } .light & { ${
              isActive
                ? "bg-primary/10 text-primary-dark"
                : "text-text-secondary-light hover:bg-black/5 hover:text-text-primary-light"
            } }`
          }
        >
          <item.icon size={18} />
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-border-custom bg-surface md:flex md:flex-col .light:border-border-light .light:bg-surface-light">
        <div className="flex h-14 items-center gap-2 border-b border-border-custom px-4 .light:border-border-light">
          <Landmark size={22} className="text-primary" />
          <span className="text-base font-bold tracking-tight">
            {t("app.title")}
          </span>
        </div>
        {navContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border-custom bg-surface md:hidden .light:border-border-light .light:bg-surface-light"
            >
              <div className="flex h-14 items-center justify-between border-b border-border-custom px-4 .light:border-border-light">
                <div className="flex items-center gap-2">
                  <Landmark size={22} className="text-primary" />
                  <span className="text-base font-bold">{t("app.title")}</span>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md p-1 hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
