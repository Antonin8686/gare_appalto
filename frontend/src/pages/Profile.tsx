import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { PermissionCode, UserRole } from "../types/rbac";
import { PERMISSION_GROUP_LABELS } from "../types/rbac";
import "./Profile.css";

function formatDate(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function userInitials(firstName: string, lastName: string, email: string): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return email.charAt(0).toUpperCase();
}

function userDisplayName(firstName: string, lastName: string, email: string): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || email;
}

function permissionGroup(code: string): keyof typeof PERMISSION_GROUP_LABELS {
  if (code.startsWith("tenders.")) return "gare";
  if (code.startsWith("companies.")) return "aziende";
  if (code.startsWith("documents.")) return "documenti";
  if (code.startsWith("offers.")) return "offerte";
  if (code.startsWith("scouting.")) return "scouting";
  return "amministrazione";
}

function permissionLabel(code: string): string {
  const labels: Record<string, string> = {
    "tenders.view": "Visualizza gare",
    "tenders.create": "Crea gare",
    "tenders.edit": "Modifica gare",
    "tenders.delete": "Elimina gare",
    "tenders.export": "Esporta gare",
    "tenders.relation.edit": "Modifica relazione tecnica",
    "tenders.relation.review": "Revisione relazione",
    "tenders.participation": "Analisi partecipazione",
    "companies.view": "Visualizza aziende",
    "companies.create": "Crea aziende",
    "companies.edit": "Modifica aziende",
    "companies.delete": "Elimina aziende",
    "documents.view": "Visualizza documenti",
    "documents.upload": "Carica documenti",
    "documents.delete": "Elimina documenti",
    "offers.view": "Visualizza offerte",
    "offers.create": "Crea offerte",
    "offers.edit": "Modifica offerte",
    "offers.delete": "Elimina offerte",
    "scouting.view": "Visualizza scouting",
    "scouting.import": "Import scouting",
    "scouting.score": "Scoring scouting",
    "admin.users.view": "Visualizza utenti",
    "admin.users.manage": "Gestione utenti",
    "admin.rag.reindex": "Reindicizzazione RAG",
    "admin.ai.use": "Funzioni AI",
  };
  return labels[code] ?? code.replace(".", " · ");
}

const ROLE_ACCENTS: Record<UserRole, string> = {
  administrator: "profile-role--admin",
  tender_manager: "profile-role--manager",
  technical_writer: "profile-role--writer",
  reviewer: "profile-role--reviewer",
  company_user: "profile-role--company",
  scouting_manager: "profile-role--scouting",
};

export function ProfilePage() {
  const { user, can, refreshUser, isLoading } = useAuth();

  useEffect(() => {
    refreshUser().catch(() => undefined);
  }, [refreshUser]);

  const groupedPermissions = useMemo(() => {
    if (!user?.permissions?.length) return [];

    const groups = new Map<string, PermissionCode[]>();
    for (const code of user.permissions) {
      const group = permissionGroup(code);
      const list = groups.get(group) ?? [];
      list.push(code);
      groups.set(group, list);
    }

    return Array.from(groups.entries())
      .map(([group, codes]) => ({
        group,
        label: PERMISSION_GROUP_LABELS[group] ?? group,
        codes: [...codes].sort(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "it"));
  }, [user?.permissions]);

  if (isLoading || !user) {
    return (
      <div className="profile-page">
        <p className="profile-loading">Caricamento profilo...</p>
      </div>
    );
  }

  const displayName = userDisplayName(user.first_name, user.last_name, user.email);
  const initials = userInitials(user.first_name, user.last_name, user.email);
  const roleClass = ROLE_ACCENTS[user.role] ?? "profile-role--default";
  const memberSince = formatDate(user.date_joined);

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero__pattern" aria-hidden />
        <div className="profile-hero__content">
          <div className="profile-hero__avatar" aria-hidden>
            {initials}
          </div>
          <div className="profile-hero__identity">
            <p className="profile-hero__eyebrow">Account personale</p>
            <h1 className="profile-hero__name">{displayName}</h1>
            <div className="profile-hero__badges">
              <span className={`profile-role ${roleClass}`}>{user.role_label}</span>
              {user.organization_name && (
                <span className="profile-org-badge">{user.organization_name}</span>
              )}
              <span
                className={`profile-status ${user.is_active ? "profile-status--active" : "profile-status--inactive"}`}
              >
                {user.is_active ? "Attivo" : "Disattivato"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="profile-stats">
        <article className="profile-stat">
          <span className="profile-stat__label">Permessi attivi</span>
          <span className="profile-stat__value">{user.permissions.length}</span>
        </article>
        <article className="profile-stat">
          <span className="profile-stat__label">Aree di accesso</span>
          <span className="profile-stat__value">{groupedPermissions.length}</span>
        </article>
        <article className="profile-stat">
          <span className="profile-stat__label">Membro dal</span>
          <span className="profile-stat__value profile-stat__value--text">{memberSince}</span>
        </article>
      </div>

      <div className="profile-layout">
        <section className="profile-panel">
          <header className="profile-panel__header">
            <span className="profile-panel__icon" aria-hidden>
              👤
            </span>
            <div>
              <h2>Dati account</h2>
              <p>Informazioni di accesso e identità</p>
            </div>
          </header>
          <dl className="profile-fields">
            <div className="profile-field">
              <dt>Nome completo</dt>
              <dd>{displayName}</dd>
            </div>
            <div className="profile-field">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${user.email}`} className="profile-field__link">
                  {user.email}
                </a>
              </dd>
            </div>
            <div className="profile-field">
              <dt>Username</dt>
              <dd>
                <code className="profile-field__code">@{user.username}</code>
              </dd>
            </div>
            <div className="profile-field">
              <dt>Membro dal</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>
        </section>

        <section className="profile-panel">
          <header className="profile-panel__header">
            <span className="profile-panel__icon" aria-hidden>
              🏢
            </span>
            <div>
              <h2>Organizzazione</h2>
              <p>Contesto di lavoro e ruolo operativo</p>
            </div>
          </header>
          <dl className="profile-fields">
            <div className="profile-field">
              <dt>Organizzazione</dt>
              <dd>{user.organization_name || "—"}</dd>
            </div>
            <div className="profile-field">
              <dt>Ruolo</dt>
              <dd>
                <span className={`profile-role profile-role--inline ${roleClass}`}>
                  {user.role_label}
                </span>
              </dd>
            </div>
            <div className="profile-field">
              <dt>Stato account</dt>
              <dd>{user.is_active ? "Account attivo" : "Account disattivato"}</dd>
            </div>
          </dl>
        </section>

        {groupedPermissions.length > 0 && (
          <section className="profile-panel profile-panel--wide">
            <header className="profile-panel__header">
              <span className="profile-panel__icon" aria-hidden>
                🔐
              </span>
              <div>
                <h2>Permessi e accessi</h2>
                <p>Cosa puoi fare all&apos;interno della piattaforma</p>
              </div>
            </header>
            <div className="profile-permissions">
              {groupedPermissions.map(({ group, label, codes }) => (
                <div key={group} className="profile-permission-group">
                  <h3>{label}</h3>
                  <ul>
                    {codes.map((code) => (
                      <li key={code}>{permissionLabel(code)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="profile-panel profile-panel--wide profile-panel--actions">
          <header className="profile-panel__header">
            <span className="profile-panel__icon" aria-hidden>
              ⚡
            </span>
            <div>
              <h2>Collegamenti rapidi</h2>
              <p>Vai alle sezioni più utili del tuo profilo</p>
            </div>
          </header>
          <div className="profile-quick-links">
            <Link to="/dashboard" className="profile-quick-link">
              <span className="profile-quick-link__title">Dashboard</span>
              <span className="profile-quick-link__desc">Panoramica gare e KPI</span>
            </Link>
            {can("tenders.view") && (
              <Link to="/tenders" className="profile-quick-link">
                <span className="profile-quick-link__title">Elenco gare</span>
                <span className="profile-quick-link__desc">Gestisci le procedure</span>
              </Link>
            )}
            {can("admin.users.view") && (
              <Link to="/admin/users" className="profile-quick-link">
                <span className="profile-quick-link__title">Gestione utenti</span>
                <span className="profile-quick-link__desc">Team e ruoli</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
