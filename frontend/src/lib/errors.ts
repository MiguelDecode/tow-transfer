import { ApiError } from "./api";

// Friendly message for a failed action on a transfer.
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "El traslado ha cambiado mientras lo estabas viendo. Hemos cargado su estado actual: revísalo e inténtalo de nuevo.";
    }
    if (error.status === 403) {
      return "No puedes hacer esto con el traslado en su estado actual.";
    }
    if (error.status === 404) {
      return "No se encontró el traslado.";
    }
  }
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}
