import type { FormEvent } from "react";

type ValidatableElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const ERROR_CLASS = "form-field-error";

export interface FieldValidationOptions {
  /** Messaggio quando il campo è vuoto */
  required?: string;
  /** Messaggio per email con formato non valido */
  email?: string;
  /** Messaggio per testo troppo corto (minLength) */
  tooShort?: string;
}

function getValidationMessage(el: ValidatableElement): string {
  const required = el.dataset.valRequired;
  const email = el.dataset.valEmail;
  const tooShort = el.dataset.valShort;

  if (required && isFieldEmpty(el)) {
    return required;
  }

  if (el.validity.valueMissing) {
    return required ?? "Questo campo è necessario per continuare";
  }

  if (
    el instanceof HTMLInputElement &&
    el.validity.typeMismatch &&
    el.type === "email"
  ) {
    return email ?? "L'indirizzo email non sembra valido. Esempio: nome@azienda.it";
  }

  if (el.validity.tooShort) {
    const min =
      "minLength" in el && typeof el.minLength === "number" ? el.minLength : 0;
    return tooShort ?? `Scrivi almeno ${min} caratteri`;
  }

  if (el.validity.rangeUnderflow) {
    return "Il valore inserito è troppo basso";
  }

  if (el.validity.patternMismatch) {
    const title = el.getAttribute("title");
    if (title) return title;
  }

  return required ?? "Verifica il valore inserito";
}

function isFieldEmpty(field: ValidatableElement): boolean {
  if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
    return !field.checked;
  }
  return !field.value.trim();
}

function showFieldError(el: ValidatableElement) {
  const message = getValidationMessage(el);

  el.classList.add("form-field--invalid");
  el.setAttribute("aria-invalid", "true");

  let errorEl = el.nextElementSibling;
  if (!errorEl?.classList.contains(ERROR_CLASS)) {
    errorEl = document.createElement("p");
    errorEl.className = ERROR_CLASS;
    errorEl.setAttribute("role", "alert");
    el.insertAdjacentElement("afterend", errorEl);
  }

  errorEl.textContent = message;
}

function clearFieldError(el: ValidatableElement) {
  el.classList.remove("form-field--invalid");
  el.removeAttribute("aria-invalid");

  const next = el.nextElementSibling;
  if (next?.classList.contains(ERROR_CLASS)) {
    next.remove();
  }
}

export function clearFormErrors(form: HTMLFormElement) {
  form.querySelectorAll<ValidatableElement>("input, select, textarea").forEach((field) => {
    clearFieldError(field);
  });
}

export function validateForm(form: HTMLFormElement): boolean {
  clearFormErrors(form);

  const fields = form.querySelectorAll<ValidatableElement>("input, select, textarea");
  let valid = true;
  let firstInvalid: ValidatableElement | undefined;

  fields.forEach((field) => {
    const requiredMessage = field.dataset.valRequired;

    if (requiredMessage && isFieldEmpty(field)) {
      showFieldError(field);
      if (!firstInvalid) {
        firstInvalid = field;
      }
      valid = false;
      return;
    }

    if (!field.willValidate) {
      return;
    }

    if (!field.checkValidity()) {
      showFieldError(field);
      if (!firstInvalid) {
        firstInvalid = field;
      }
      valid = false;
    }
  });

  firstInvalid?.focus();
  return valid;
}

export function fieldValidation(options: FieldValidationOptions) {
  const {
    required,
    email = "L'indirizzo email non sembra valido. Esempio: nome@azienda.it",
    tooShort,
  } = options;

  return {
    ...(required ? { "data-val-required": required } : {}),
    "data-val-email": email,
    ...(tooShort ? { "data-val-short": tooShort } : {}),
    onInvalid(event: FormEvent<ValidatableElement>) {
      event.preventDefault();
      showFieldError(event.currentTarget);
    },
    onInput(event: FormEvent<ValidatableElement>) {
      const el = event.currentTarget;
      if (el.checkValidity()) {
        clearFieldError(el);
      }
    },
    onBlur(event: FormEvent<ValidatableElement>) {
      const el = event.currentTarget;
      if (!el.checkValidity()) {
        showFieldError(el);
      } else {
        clearFieldError(el);
      }
    },
  };
}
