import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./NavGroup.css";

export interface NavGroupItem {
  to: string;
  label: string;
  end?: boolean;
}

interface NavGroupProps {
  label: string;
  items: NavGroupItem[];
  onNavigate?: () => void;
  /** Stato del menu mobile principale: chiude i sottomenu quando si chiude. */
  menuOpen?: boolean;
}

function useIsDesktopNav(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function NavGroup({ label, items, onNavigate, menuOpen = true }: NavGroupProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = useIsDesktopNav();

  const isActive = items.some((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    if (!isDesktop) return;
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    if (!isDesktop) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      setOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: Event) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  if (items.length === 0) return null;

  if (items.length === 1) {
    const item = items[0];
    return (
      <NavLink to={item.to} end={item.end} className="app-nav__link" onClick={onNavigate}>
        {label}
      </NavLink>
    );
  }

  function handleTriggerClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOpen((value) => !value);
  }

  const hoverHandlers = isDesktop
    ? {
        onMouseEnter: openMenu,
        onMouseLeave: scheduleClose,
      }
    : {};

  return (
    <div
      ref={rootRef}
      className={`app-nav__group${open ? " app-nav__group--open" : ""}${isActive ? " app-nav__group--active" : ""}${isDesktop ? "" : " app-nav__group--mobile"}`}
      {...hoverHandlers}
    >
      <button
        type="button"
        className="app-nav__group-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleTriggerClick}
      >
        {label}
        <span className="app-nav__chevron" aria-hidden />
      </button>

      <div
        className="app-nav__dropdown"
        role="menu"
        {...(isDesktop ? { onMouseEnter: openMenu, onMouseLeave: scheduleClose } : {})}
      >
        <div className="app-nav__dropdown-inner">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              role="menuitem"
              className="app-nav__dropdown-link"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
