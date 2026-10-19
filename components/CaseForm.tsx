"use client";

import { useState } from "react";
import type { NewCaseInput, ValidationErrors } from "@/lib/types";
import { validateNewCase } from "@/lib/validate-case";
import { cn } from "@/lib/cn";

interface Props {
  onSubmit: (input: NewCaseInput) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const EMPTY: NewCaseInput = { title: "", referenceNumber: "", description: "" };

export function CaseForm({ onSubmit, onCancel, loading = false }: Props) {
  const [values, setValues] = useState<NewCaseInput>(EMPTY);
  const [errors, setErrors] = useState<ValidationErrors<NewCaseInput>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof NewCaseInput, boolean>>>({});

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (touched[name as keyof NewCaseInput]) {
      // Re-validate on change after first blur
      const errs = validateNewCase({ ...values, [name]: value });
      setErrors((prev) => ({ ...prev, [name]: errs[name as keyof NewCaseInput] }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    const errs = validateNewCase(values);
    setErrors((prev) => ({ ...prev, [name]: errs[name as keyof NewCaseInput] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateNewCase(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTouched({ title: true, referenceNumber: true, description: true });
      return;
    }
    onSubmit(values);
    setValues(EMPTY);
    setErrors({});
    setTouched({});
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="label">
          Case title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          autoComplete="off"
          maxLength={120}
          placeholder="e.g. Operation Nightwatch — CCTV review"
          value={values.title}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={loading}
          className={cn("input", errors.title && "border-red-400 focus:border-red-400 focus:ring-red-400/30")}
        />
        {errors.title && <p className="error-text">{errors.title}</p>}
      </div>

      {/* Reference number */}
      <div>
        <label htmlFor="referenceNumber" className="label">
          Reference number <span className="text-red-500">*</span>
        </label>
        <input
          id="referenceNumber"
          name="referenceNumber"
          type="text"
          autoComplete="off"
          maxLength={40}
          placeholder="e.g. CID-2024/001"
          value={values.referenceNumber}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={loading}
          className={cn(
            "input font-mono",
            errors.referenceNumber && "border-red-400 focus:border-red-400 focus:ring-red-400/30"
          )}
        />
        {errors.referenceNumber && (
          <p className="error-text">{errors.referenceNumber}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="label">
          Description{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          placeholder="Brief summary of the investigation context…"
          value={values.description}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={loading}
          className={cn(
            "input resize-y",
            errors.description && "border-red-400 focus:border-red-400 focus:ring-red-400/30"
          )}
        />
        <div className="flex justify-between">
          {errors.description ? (
            <p className="error-text">{errors.description}</p>
          ) : (
            <span />
          )}
          <p className="mt-1 text-right text-xs text-slate-400">
            {values.description.length}/1000
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create case"}
        </button>
      </div>
    </form>
  );
}
