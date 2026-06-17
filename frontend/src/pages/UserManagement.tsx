import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, Fragment, useMemo, useState } from "react";
import {
  createOrganizationUser,
  deleteOrganizationUser,
  fetchOrganizationUsers,
  fetchRbacMatrix,
  updateOrganizationUser,
} from "../api/users";
import { formatApiError } from "../utils/apiError";
import { fieldValidation, validateForm } from "../utils/formValidation";
import { PermissionMatrix } from "../components/PermissionMatrix";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_LABELS, type OrganizationUser, type UserRole } from "../types/rbac";
import "./UserManagement.css";

const ROLES = Object.keys(ROLE_LABELS) as UserRole[];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface EditFormState {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  password: string;
}

function userToForm(user: OrganizationUser): EditFormState {
  return {
    email: user.email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    is_active: user.is_active,
    password: "",
  };
}

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["organization-users"],
    queryFn: fetchOrganizationUsers,
  });

  const { data: rbacMatrix } = useQuery({
    queryKey: ["rbac", "matrix"],
    queryFn: fetchRbacMatrix,
  });

  const permissionLabels = useMemo(() => {
    if (!rbacMatrix) return {};
    return rbacMatrix.permission_labels;
  }, [rbacMatrix]);

  const safeUsers = Array.isArray(users) ? users : [];
  const editingUser = safeUsers.find((user) => user.id === editingUserId) ?? null;

  const createMutation = useMutation({
    mutationFn: createOrganizationUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-users"] });
      setShowForm(false);
      setFormError(null);
    },
    onError: (error) => setFormError(formatApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: Parameters<typeof updateOrganizationUser>[1];
    }) => updateOrganizationUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-users"] });
      closeEdit();
    },
    onError: (error) => setEditError(formatApiError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrganizationUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-users"] });
      closeEdit();
    },
    onError: (error) => setEditError(formatApiError(error)),
  });

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      return;
    }
    const form = new FormData(event.currentTarget);
    createMutation.mutate({
      email: String(form.get("email") ?? ""),
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      role: String(form.get("role") ?? "company_user") as UserRole,
      is_active: form.get("is_active") === "on",
    });
  }

  function toggleEdit(user: OrganizationUser) {
    if (editingUserId === user.id) {
      closeEdit();
      return;
    }
    setEditingUserId(user.id);
    setEditForm(userToForm(user));
    setEditError(null);
    setExpandedUserId(null);
  }

  function closeEdit() {
    setEditingUserId(null);
    setEditForm(null);
    setEditError(null);
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      return;
    }
    if (!editingUserId || !editForm) return;

    const payload: Parameters<typeof updateOrganizationUser>[1] = {
      email: editForm.email,
      username: editForm.username,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      role: editForm.role,
      is_active: editForm.is_active,
    };
    if (editForm.password.trim()) {
      payload.password = editForm.password;
    }

    updateMutation.mutate({ userId: editingUserId, payload });
  }

  function handleDelete() {
    if (!editingUser) return;
    if (!window.confirm(`Eliminare l'utente ${editingUser.email}? L'operazione è irreversibile.`)) {
      return;
    }
    deleteMutation.mutate(editingUser.id);
  }

  function updateEditField<K extends keyof EditFormState>(field: K, value: EditFormState[K]) {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function togglePermissions(userId: number) {
    setExpandedUserId((id) => (id === userId ? null : userId));
    if (editingUserId !== null && editingUserId !== userId) {
      closeEdit();
    }
  }

  const isSelf = editingUser?.id === currentUser?.id;

  return (
    <div className="user-management">
      <header className="user-management__header">
        <div>
          <h2>Gestione utenti</h2>
          <p>Utenti dell&apos;organizzazione {currentUser?.organization_name}</p>
        </div>
        <button
          type="button"
          className="user-management__add"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? "Annulla" : "Nuovo utente"}
        </button>
      </header>

      {showForm && (
        <form className="user-management__form" onSubmit={handleCreate} noValidate>
          <h3>Crea utente</h3>
          <div className="user-management__form-grid">
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="off"
                {...fieldValidation({
                  required: "Inserisci l'indirizzo email dell'utente",
                  email: "L'indirizzo email non sembra valido. Esempio: nome@azienda.it",
                })}
              />
            </label>
            <label>
              Username
              <input
                name="username"
                autoComplete="off"
                {...fieldValidation({
                  required: "Inserisci lo username dell'utente",
                })}
              />
            </label>
            <label>
              Nome
              <input
                name="first_name"
                autoComplete="off"
                {...fieldValidation({
                  required: "Inserisci il nome",
                })}
              />
            </label>
            <label>
              Cognome
              <input
                name="last_name"
                autoComplete="off"
                {...fieldValidation({
                  required: "Inserisci il cognome",
                })}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                {...fieldValidation({
                  required: "Inserisci una password per l'utente",
                  tooShort: "La password deve contenere almeno 8 caratteri",
                })}
              />
            </label>
            <label>
              Ruolo
              <select name="role" defaultValue="company_user">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="user-management__checkbox-label">
              <input name="is_active" type="checkbox" defaultChecked />
              Account attivo
            </label>
          </div>
          {formError && <p className="user-management__error">{formError}</p>}
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creazione..." : "Crea utente"}
          </button>
        </form>
      )}

      <section className="user-management__list">
        <h3>Utenti ({safeUsers.length})</h3>
        {isError && (
          <p className="user-management__error">
            Impossibile caricare gli utenti. Verifica i permessi e che il backend sia avviato.
          </p>
        )}
        {isLoading ? (
          <p>Caricamento...</p>
        ) : (
          <div className="user-management__table-wrap">
            <table className="user-management__table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Email / Username</th>
                  <th>Ruolo</th>
                  <th>Stato</th>
                  <th>Iscritto</th>
                  <th aria-label="Azioni" />
                </tr>
              </thead>
              <tbody>
                {safeUsers.map((user) => (
                  <Fragment key={user.id}>
                    <tr className={editingUserId === user.id ? "user-management__row--editing" : ""}>
                      <td>
                        <strong>
                          {user.first_name} {user.last_name}
                        </strong>
                        {user.id === currentUser?.id && (
                          <span className="user-management__you"> (tu)</span>
                        )}
                      </td>
                      <td>
                        <div className="user-management__email">{user.email}</div>
                        <div className="user-management__username">@{user.username}</div>
                      </td>
                      <td>
                        <span className="user-management__role-badge">{user.role_label}</span>
                      </td>
                      <td>
                        <span
                          className={`user-management__status user-management__status--${user.is_active ? "active" : "inactive"}`}
                        >
                          {user.is_active ? "Attivo" : "Disattivato"}
                        </span>
                      </td>
                      <td>{formatDate(user.date_joined)}</td>
                      <td className="user-management__actions">
                        <button
                          type="button"
                          className={`user-management__btn user-management__btn--ghost${expandedUserId === user.id ? " user-management__btn--active" : ""}`}
                          onClick={() => togglePermissions(user.id)}
                        >
                          Permessi
                        </button>
                        <button
                          type="button"
                          className={`user-management__btn${editingUserId === user.id ? " user-management__btn--active" : ""}`}
                          onClick={() => toggleEdit(user)}
                        >
                          {editingUserId === user.id ? "Chiudi" : "Modifica"}
                        </button>
                      </td>
                    </tr>

                    {editingUserId === user.id && editForm && (
                      <tr className="user-management__edit-row">
                        <td colSpan={6}>
                          <form className="user-management__inline-edit" onSubmit={handleEditSubmit} noValidate>
                            <div className="user-management__inline-edit-header">
                              <h4>
                                Modifica utente
                                {isSelf && <span className="user-management__you"> (il tuo account)</span>}
                              </h4>
                            </div>

                            <div className="user-management__form-grid">
                              <label>
                                Email
                                <input
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) => updateEditField("email", e.target.value)}
                                  {...fieldValidation({
                                    required: "Inserisci l'indirizzo email",
                                    email: "L'indirizzo email non sembra valido. Esempio: nome@azienda.it",
                                  })}
                                />
                              </label>
                              <label>
                                Username
                                <input
                                  value={editForm.username}
                                  onChange={(e) => updateEditField("username", e.target.value)}
                                  {...fieldValidation({
                                    required: "Inserisci lo username",
                                  })}
                                />
                              </label>
                              <label>
                                Nome
                                <input
                                  value={editForm.first_name}
                                  onChange={(e) => updateEditField("first_name", e.target.value)}
                                  {...fieldValidation({
                                    required: "Inserisci il nome",
                                  })}
                                />
                              </label>
                              <label>
                                Cognome
                                <input
                                  value={editForm.last_name}
                                  onChange={(e) => updateEditField("last_name", e.target.value)}
                                  {...fieldValidation({
                                    required: "Inserisci il cognome",
                                  })}
                                />
                              </label>
                              <label>
                                Ruolo
                                <select
                                  value={editForm.role}
                                  disabled={isSelf}
                                  onChange={(e) => updateEditField("role", e.target.value as UserRole)}
                                >
                                  {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {ROLE_LABELS[role]}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Nuova password
                                <input
                                  type="password"
                                  minLength={8}
                                  placeholder="Lascia vuoto per non cambiare"
                                  value={editForm.password}
                                  onChange={(e) => updateEditField("password", e.target.value)}
                                  {...fieldValidation({
                                    tooShort: "La password deve contenere almeno 8 caratteri",
                                  })}
                                />
                              </label>
                              <label className="user-management__checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_active}
                                  disabled={isSelf}
                                  onChange={(e) => updateEditField("is_active", e.target.checked)}
                                />
                                Account attivo
                              </label>
                            </div>

                            {editError && <p className="user-management__error">{editError}</p>}

                            <div className="user-management__inline-actions">
                              {!isSelf && (
                                <button
                                  type="button"
                                  className="user-management__btn user-management__btn--danger"
                                  onClick={handleDelete}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Eliminazione..." : "Elimina utente"}
                                </button>
                              )}
                              <div className="user-management__inline-actions-right">
                                <button
                                  type="button"
                                  className="user-management__btn user-management__btn--ghost"
                                  onClick={closeEdit}
                                >
                                  Annulla
                                </button>
                                <button
                                  type="submit"
                                  className="user-management__btn user-management__btn--primary"
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending ? "Salvataggio..." : "Salva modifiche"}
                                </button>
                              </div>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}

                    {expandedUserId === user.id && editingUserId !== user.id && (
                      <tr className="user-management__expand-row">
                        <td colSpan={6}>
                          <div className="user-management__perms">
                            <strong>{(user.permissions ?? []).length} permessi assegnati</strong>
                            <ul>
                              {(user.permissions ?? []).map((perm) => (
                                <li key={perm}>{permissionLabels[perm] ?? perm}</li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PermissionMatrix />
    </div>
  );
}
