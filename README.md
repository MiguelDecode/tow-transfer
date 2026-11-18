# Tow Transfer

*Gestión de traslados en grúa entre centros.*

Aplicación web interna para gestionar las solicitudes de traslado de vehículos entre los distintos centros de trabajo de un grupo de concesionarios. Sustituye el flujo actual (correo electrónico + Excel) por un sistema con roles, estados e historial.

> **Estado del proyecto:** en planificación (Paso 7 de 16).
> Proyecto de estudio / portfolio, con posibilidad de uso real en la empresa.

---

## 1. Descripción

- Entre 10 y 20 concesionarios, 2-3 gruistas y más de 40 solicitantes.
- Los gruistas usan la app sobre todo desde el **móvil**; solicitantes, gestores y administradores desde ordenador.
- Uso interno: sin registro público, las cuentas las crea el administrador.
- Sin notificaciones en la primera versión: basta con consultar el estado en la web.

## 2. Roles

| Rol | Descripción |
|---|---|
| **Solicitante** | Pertenece a un concesionario. Solicita traslados y consulta su estado. |
| **Gruista** | Se asigna traslados disponibles y fija fecha y hora según su disponibilidad. |
| **Gestor** | Supervisa y organiza los traslados. No gestiona usuarios ni cancela. |
| **Administrador** | Todos los permisos, incluida la gestión de usuarios y centros. |

### Matriz de permisos

| Acción | Solicitante | Gruista | Gestor | Admin |
|---|---|---|---|---|
| Crear traslado | ✅ | ❌ | ✅ | ✅ |
| Ver traslados | Solo los suyos | Pendientes + los suyos | Todos | Todos |
| Editar datos del traslado | Los suyos, solo si `pendiente` | ❌ | ✅ | ✅ |
| Cancelar | Los suyos, solo si `pendiente` | ❌ | ❌ | ✅ en cualquier estado |
| Autoasignarse y fijar fecha/hora | ❌ | ✅ | ❌ | ❌ |
| Asignar o reasignar gruista y fecha/hora | ❌ | ❌ | ✅ | ✅ |
| Liberar un traslado (solo en `asignado`) | ❌ | ✅ (los suyos) | ✅ | ✅ |
| Pasar a `en curso` y `entregado` | ❌ | ✅ (los suyos) | ❌ | ✅ |
| Gestionar centros (lista fija) | ❌ | ❌ | ❌ | ✅ |
| Alta, baja y desactivación de usuarios | ❌ | ❌ | ❌ | ✅ |

## 3. Traslados

Un traslado corresponde a **un vehículo**.

| Campo | Notas |
|---|---|
| Matrícula / chasis | Al menos uno de los dos |
| Marca y modelo | |
| Centro de recogida | De la lista fija de centros |
| Centro de entrega | De la lista fija de centros |
| Fecha y hora deseada | Propuesta del solicitante, no vinculante |
| Fecha y hora asignada | La fija el gruista (o admin/gestor) |
| Urgencia | `baja`, `normal`, `alta`, `urgente` |
| Estado | Ver ciclo de vida |
| Observaciones | Texto libre |

### Ciclo de vida

Estados: `pendiente`, `asignado`, `en curso`, `entregado`, `cancelado`.

```mermaid
stateDiagram-v2
    [*] --> pendiente
    pendiente --> asignado: gruista se asigna / admin o gestor asigna
    asignado --> pendiente: liberar
    asignado --> en_curso: gruista inicia
    en_curso --> entregado: gruista entrega
    pendiente --> cancelado: solicitante o admin
    asignado --> cancelado: admin
    en_curso --> cancelado: admin
    entregado --> [*]
    cancelado --> [*]
```

Cada cambio de estado se registrará en un **historial** (quién, cuándo, de qué estado a cuál).

## 4. Modelo de datos

Cuatro tablas: `centers`, `users`, `transfers` y `transfer_status_history`.

| Tabla | Campos principales |
|---|---|
| `centers` | id, name (único), address, active |
| `users` | id, name, email (único), password_hash, role, center_id, active, created_at |
| `transfers` | id, plate, vin, brand, model, origin_center_id, destination_center_id, requested_at, scheduled_at, urgency, status, notes, requester_id, driver_id, created_at, updated_at |
| `transfer_status_history` | id, transfer_id, status, changed_by, changed_at |

Relaciones: un centro tiene muchos usuarios; un centro es origen o destino de muchos traslados; un usuario es solicitante o gruista de muchos traslados; un traslado tiene muchas entradas de historial.

Reglas de integridad:

- Debe haber matrícula o chasis.
- Origen y destino no pueden ser el mismo centro.
- No puede haber dos traslados activos (`pendiente`, `asignado`, `en curso`) para la misma matrícula o chasis.
- `centers.active` y `users.active` permiten desactivar sin borrar.
- El campo `status` de `transfers` guarda el estado **actual**; `transfer_status_history` guarda **cada cambio** (quién y cuándo), lo que dará el historial futuro.

## 5. Tecnologías

> Stack confirmado en el Paso 3. Desarrollo sobre Linux (Manjaro).

| Capa | Tecnología |
|---|---|
| Frontend | Vite + React + TypeScript + React Router (diseño responsive, móvil primero) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL con Prisma |
| Autenticación | Usuario/contraseña (bcrypt) + JWT, control de roles en el servidor |
| Validación | Zod |
| Contenedores | Docker |

## 6. Despliegue

*Por definir (Paso 14).*

- **Fase de prueba:** alojamiento gratuito en la nube.
- **Fase futura:** servidor propio de la empresa, mediante Docker.

## 7. Instalación en local

Requisitos: Node.js, Git y Docker con el plugin Compose (`docker compose`).

```bash
# 1. Base de datos (PostgreSQL en Docker), desde la raíz del proyecto
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:3000/api/health

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Linter: `npm run lint` en `backend` y en `frontend`.

## 8. Registro de pasos

| Nº | Paso | Estado |
|---|---|---|
| 1 | Definir requisitos y alcance del MVP | ✅ Completado |
| 2 | Definir roles, permisos y estados | ✅ Completado |
| 3 | Elegir stack tecnológico | ✅ Completado |
| 4 | Diseñar modelo de datos | ✅ Completado |
| 5 | Bocetar pantallas | ✅ Completado |
| 6 | Preparar entorno (Node, Git, Vite + React + TS) | ✅ Completado |
| 7 | Configurar backend y base de datos | 🔄 En curso |
| 8 | Autenticación y roles | ⏳ |
| 9 | Pantallas del solicitante | ⏳ |
| 10 | Pantallas del administrador y gestor | ⏳ |
| 11 | Pantallas del gruista | ⏳ |
| 12 | Validaciones, errores y estados de carga | ⏳ |
| 13 | Pruebas | ⏳ |
| 14 | Despliegue | ⏳ |
| 15 | Documentación final | ⏳ |
| 16 | Feedback y versión 2 | ⏳ |

## 9. Decisiones tomadas

| Decisión | Motivo |
|---|---|
| Nombre de la aplicación: **Tow Transfer** (repositorio `tow-transfer`) | Corto, en inglés y fácil de recordar |
| Cuatro roles (solicitante, gruista, gestor, admin) | Separar la supervisión diaria de la administración de usuarios |
| El gruista se autoasigna los traslados | Es quien conoce su disponibilidad |
| El gruista puede liberar un traslado, no cancelarlo | La cancelación la decide el solicitante (si está `pendiente`) o el admin |
| El solicitante solo edita o cancela en `pendiente` | Una vez agendado, no puede alterar la planificación del gruista |
| Lista fija de centros gestionada por el admin | Evita datos inconsistentes |
| Los usuarios se desactivan, no se borran | Conservar el historial de traslados |
| Los centros no guardan marca | No se limitarán los traslados por marca |
| Se evitan traslados activos duplicados por matrícula o chasis | Evitar solicitudes repetidas por error |
| Los gruistas atienden cualquier centro | Solo hay 2-3 gruistas |
| Tabla de historial de estados, además del estado actual | Saber quién cambió qué y cuándo; base del historial futuro |
| Colores del frontend como variables CSS (`--accent`, `--ink`, `--bg`, colores de estado…) | Poder adaptarlos a la imagen corporativa del grupo cambiando un solo bloque |
| Pantallas de login, detalle de traslado y centros sin boceto previo | Se diseñarán al programarlas, reutilizando el estilo de las demás |
| Sin notificaciones ni comprobante de entrega en la v1 | Mantener el MVP sencillo |
| ESLint como linter (en lugar de Oxlint) | Estándar, muy documentado y con el ecosistema de plugins más completo; el tamaño del proyecto no requiere la velocidad de Oxlint |
| TypeScript fijado en la versión 6.0 (`~6.0.3`) en el backend | typescript-eslint aún no soporta TypeScript 7; se actualizará cuando lo haga |
| PostgreSQL en Docker durante el desarrollo | Instalación idéntica en cualquier equipo y fácil de reproducir en el servidor de la empresa |
| Repositorio en GitHub; una rama por paso o feature integrada en `main` con Pull Request | Mantener `main` estable, tener un historial ordenado y practicar un flujo de trabajo profesional |
| Código, ramas, commits y Pull Requests en inglés; interfaz en español | Seguir la convención habitual del código y mantener la aplicación en el idioma de los usuarios |
| Backend propio en lugar de servicio gestionado | Objetivo de aprendizaje |
| Docker para el despliegue | Facilitar el paso posterior a un servidor de la empresa |
| Stack: React + TS, Node/Express, PostgreSQL + Prisma, JWT, Zod | Encaja con el objetivo de aprender backend, con tipado de extremo a extremo |

## 10. Flujo de trabajo con Git

- **`main`** contiene siempre una versión que funciona.
- Cada paso del plan o feature se desarrolla en **su propia rama**, con nombre `tipo/descripcion-corta` (por ejemplo `feat/step-07-prisma-schema`). Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
- Los commits son pequeños y siguen el formato `tipo: descripción` (por ejemplo `feat: add Prisma schema`).
- **Idioma:** código, nombres de ramas, mensajes de commit y Pull Requests en inglés; la interfaz de la aplicación en español.
- La rama se integra en `main` mediante **Pull Request** (squash and merge) y después se borra.

```bash
git switch main && git pull
git switch -c feat/nombre-de-la-rama
# ... trabajar y hacer commits ...
git push -u origin feat/nombre-de-la-rama
# abrir Pull Request en GitHub, fusionar y borrar la rama
git switch main && git pull
git branch -d feat/nombre-de-la-rama
```

## 11. Roadmap (versiones futuras)

- Seguimiento GPS en tiempo real
- Calendario de disponibilidad de grúas
- Historial y consulta de traslados pasados
- Posibles ideas posteriores: notificaciones, informes y estadísticas
