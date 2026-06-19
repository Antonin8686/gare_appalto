import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import type { User } from "../types/auth";
import "./UserMenu.css";

interface UserMenuProps {
  user: User | null;
  onLogout: () => void;
  onNavigate?: () => void;
}

function userInitials(user: User | null): string {
  if (!user) return "?";
  const first = user.first_name?.charAt(0) ?? "";
  const last = user.last_name?.charAt(0) ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

function userDisplayName(user: User | null): string {
  if (!user) return "Utente";
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return full || user.email;
}

export function UserMenu({ user, onLogout, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      document.body.classList.add("user-menu-sheet-open");
    }

    let removePointer: (() => void) | undefined;

    const timeoutId = window.setTimeout(() => {
      function handlePointerDown(event: PointerEvent) {
        if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }

      document.addEventListener("pointerdown", handlePointerDown);
      removePointer = () => document.removeEventListener("pointerdown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      removePointer?.();
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("user-menu-sheet-open");
    };
  }, [open]);

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={rootRef} className={`user-menu${open ? " user-menu--open" : ""}`}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Account di ${userDisplayName(user)}`}
        title={userDisplayName(user)}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-menu__avatar">{userInitials(user)}</span>
      </button>

      {open && (
        <button
          type="button"
          className="user-menu__backdrop"
          aria-label="Chiudi menu account"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}

      <div className="user-menu__dropdown" role="menu" aria-hidden={!open}>
        <div className="user-menu__sheet-handle" aria-hidden />

        <div className="user-menu__meta">
          <span className="user-menu__meta-avatar">{userInitials(user)}</span>
          <div className="user-menu__meta-text">
            <strong>{userDisplayName(user)}</strong>
            <span>{user?.email}</span>
            {user?.role_label && <span className="user-menu__role">{user.role_label}</span>}
          </div>
        </div>

        <div className="user-menu__actions">
          <NavLink to="/profile" role="menuitem" className="user-menu__item" onClick={close}>
            Profilo
          </NavLink>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item user-menu__item--logout"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  );
}
