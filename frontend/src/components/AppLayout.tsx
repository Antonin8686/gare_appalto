import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GlobalSemanticSearch } from "./GlobalSemanticSearch";
import { NavGroup, type NavGroupItem } from "./NavGroup";
import { UserMenu } from "./UserMenu";
import "./AppLayout.css";
import "./NavGroup.css";

export function AppLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const gareItems = useMemo(() => {
    const items: NavGroupItem[] = [];
    if (can("tenders.view")) {
      items.push({ to: "/tenders", label: "Elenco gare", end: true });
      items.push({ to: "/tenders/board", label: "Board Kanban" });
    }
    if (can("scouting.view")) {
      items.push({ to: "/tenders/imported", label: "Gare importate" });
      items.push({ to: "/scouting", label: "Scouting" });
    }
    if (can("scouting.import")) {
      items.push({ to: "/imports/telemat", label: "Import Telemat" });
    }
    if (can("documents.view")) {
      items.push({ to: "/search", label: "Ricerca documenti" });
    }
    return items;
  }, [can]);

  const partecipazioneItems = useMemo(() => {
    const items: NavGroupItem[] = [];
    if (can("tenders.participation")) {
      items.push({ to: "/participation", label: "Analisi partecipazione", end: true });
    }
    if (can("tenders.view") && can("companies.view")) {
      items.push({ to: "/requirements-matrix", label: "Matrice requisiti" });
    }
    return items;
  }, [can]);

  const adminItems = useMemo(() => {
    const items: NavGroupItem[] = [];
    if (can("admin.users.view")) {
      items.push({ to: "/admin/users", label: "Gestione utenti", end: true });
    }
    return items;
  }, [can]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function closeNav() {
    setNavOpen(false);
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__row">
          <NavLink to="/dashboard" className="app-header__brand" onClick={closeNav}>
            <span className="app-header__logo" aria-hidden>
              GA
            </span>
            <span className="app-header__title">Gare Appalto</span>
          </NavLink>

          <div className="app-header__search-row">
            <GlobalSemanticSearch />
            <UserMenu user={user} onLogout={handleLogout} onNavigate={closeNav} />
          </div>

          <button
            type="button"
            className="app-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="app-nav"
            aria-label={navOpen ? "Chiudi menu" : "Apri menu"}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="app-nav-toggle__bar" />
            <span className="app-nav-toggle__bar" />
            <span className="app-nav-toggle__bar" />
          </button>
        </div>

        <nav id="app-nav" className={`app-nav${navOpen ? " app-nav--open" : ""}`}>
          <NavLink to="/dashboard" end className="app-nav__link" onClick={closeNav}>
            Dashboard
          </NavLink>

          <NavGroup label="Gare" items={gareItems} onNavigate={closeNav} menuOpen={navOpen} />

          {can("companies.view") && (
            <NavLink to="/companies" className="app-nav__link" onClick={closeNav}>
              Aziende
            </NavLink>
          )}

          <NavGroup
            label="Partecipazione"
            items={partecipazioneItems}
            onNavigate={closeNav}
            menuOpen={navOpen}
          />

          {can("offers.view") && (
            <NavLink to="/technical-offers" className="app-nav__link" onClick={closeNav}>
              Libreria OT
            </NavLink>
          )}

          {adminItems.length > 0 && (
            <NavGroup
              label="Amministrazione"
              items={adminItems}
              onNavigate={closeNav}
              menuOpen={navOpen}
            />
          )}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
