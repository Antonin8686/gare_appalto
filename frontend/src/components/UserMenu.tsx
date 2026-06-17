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

      <div className="user-menu__dropdown" role="menu">
        <div className="user-menu__meta">
          <strong>{userDisplayName(user)}</strong>
          <span>{user?.email}</span>
          {user?.role_label && <span className="user-menu__role">{user.role_label}</span>}
        </div>
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
  );
}
