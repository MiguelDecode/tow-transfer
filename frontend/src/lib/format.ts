const dateTimeFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return dateTimeFormat.format(new Date(iso));
}
