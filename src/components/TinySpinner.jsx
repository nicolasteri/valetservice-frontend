// src/components/TinySpinner.jsx
import React from "react";

export default function TinySpinner({ title = "Loading…" }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-gray-500"
      aria-live="polite"
      aria-label={title}
      role="status"
    >
      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="3" fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
        />
      </svg>
      <span className="sr-only">{title}</span>
    </span>
  );
}
