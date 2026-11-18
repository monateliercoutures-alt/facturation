"use client";

import { useFormStatus } from "react-dom";

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  defaultValue?: string | null;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">;

export function Field({ name, label, error, hint, defaultValue, ...input }: FieldProps) {
  const id = `f-${name}`;
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input id={id} name={name} defaultValue={defaultValue ?? undefined} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextAreaProps = { name: string; label: string; error?: string; hint?: string; defaultValue?: string | null } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name" | "defaultValue"
>;

export function TextArea({ name, label, error, hint, defaultValue, ...rest }: TextAreaProps) {
  const id = `f-${name}`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea id={id} name={name} defaultValue={defaultValue ?? undefined} className="input min-h-24" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest} />
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, pendingLabel, className = "" }: { children: React.ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn ${className}`} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message) return null;
  return (
    <p role={ok ? "status" : "alert"} className={`mb-4 rounded-xl px-3 py-2.5 text-sm font-semibold ${ok ? "bg-gs text-g" : "bg-errs text-err"}`}>
      {message}
    </p>
  );
}
