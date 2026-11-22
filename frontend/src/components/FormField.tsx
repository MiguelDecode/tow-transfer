import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  className = "",
  children,
}: Props) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
