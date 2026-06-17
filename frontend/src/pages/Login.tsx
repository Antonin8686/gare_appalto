import { isAxiosError } from "axios";
import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fieldValidation, validateForm } from "../utils/formValidation";
import "./Login.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) {
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      if (isAxiosError(err) && !err.response) {
        setError(
          "Impossibile contattare il server. Avvia il backend con: python manage.py runserver 8001",
        );
      } else if (isAxiosError(err) && err.response?.status === 401) {
        setError("Credenziali non valide. Riprova.");
      } else if (isAxiosError(err) && typeof err.response?.data?.detail === "string") {
        setError(err.response.data.detail);
      } else {
        setError("Errore durante l'accesso. Riprova.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg__grid" />
        <div className="login-bg__glow login-bg__glow--1" />
        <div className="login-bg__glow login-bg__glow--2" />
      </div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-card__badge">Gare Appalto</div>
        <h1>Accedi</h1>
        <p className="login-subtitle">
          Gestisci bandi, offerte e documentazione in un unico portale.
        </p>

        <div className="login-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="nome@azienda.it"
            {...fieldValidation({
              required: "Inserisci il tuo indirizzo email per accedere",
              email: "L'indirizzo email non sembra valido. Esempio: nome@azienda.it",
            })}
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            {...fieldValidation({
              required: "Inserisci la password per continuare",
            })}
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={submitting || isLoading}>
          {submitting ? "Accesso..." : "Entra"}
        </button>
      </form>
    </div>
  );
}
