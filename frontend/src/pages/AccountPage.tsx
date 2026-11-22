import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import FormField from "../components/FormField";
import { useChangePassword, useMe } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { roleLabels } from "../lib/labels";

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmPassword: z.string().min(1, "Repite la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["newPassword"],
  });

type PasswordForm = z.infer<typeof passwordFormSchema>;

const inputClass =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2";

export default function AccountPage() {
  const me = useMe();
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  let serverError: string | null = null;
  if (changePassword.error) {
    serverError =
      changePassword.error instanceof ApiError &&
      changePassword.error.message.includes("Current password")
        ? "La contraseña actual no es correcta."
        : "No se pudo cambiar la contraseña. Inténtalo de nuevo.";
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>

      {me.data && (
        <dl className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Nombre</dt>
            <dd>{me.data.name}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Email</dt>
            <dd>{me.data.email}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Rol</dt>
            <dd>{roleLabels[me.data.role]}</dd>
          </div>
        </dl>
      )}

      <h2 className="mt-6 text-lg font-semibold">Cambiar contraseña</h2>
      <form
        onSubmit={handleSubmit((values) =>
          changePassword.mutate(
            {
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            },
            { onSuccess: () => reset() },
          ),
        )}
        noValidate
        className="mt-3 space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <FormField
          label="Contraseña actual"
          htmlFor="currentPassword"
          error={errors.currentPassword?.message}
        >
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register("currentPassword")}
          />
        </FormField>

        <FormField
          label="Nueva contraseña"
          htmlFor="newPassword"
          error={errors.newPassword?.message}
          hint="Entre 8 y 72 caracteres."
        >
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register("newPassword")}
          />
        </FormField>

        <FormField
          label="Repite la nueva contraseña"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register("confirmPassword")}
          />
        </FormField>

        {serverError && (
          <p
            role="alert"
            className="rounded bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {serverError}
          </p>
        )}
        {changePassword.isSuccess && (
          <p
            role="status"
            className="rounded bg-green-50 px-3 py-2 text-sm text-green-800"
          >
            Contraseña actualizada correctamente.
          </p>
        )}

        <button
          type="submit"
          disabled={changePassword.isPending}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {changePassword.isPending ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </section>
  );
}
