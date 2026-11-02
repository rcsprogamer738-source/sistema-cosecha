import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

interface Cuadrilla {
  id_cuadrilla: number;
  nombre_cuadrilla: string;
  zona_asignada: string | null;
}

interface CuadrillaForm {
  nombre_cuadrilla: string;
  zona_asignada: string;
}

const API_URL = "http://localhost:3000";
const EMPTY_FORM: CuadrillaForm = { nombre_cuadrilla: "", zona_asignada: "" };

const inputClass =
  "w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-base text-white placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60";

function isCuadrilla(value: unknown): value is Cuadrilla {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cuadrilla = value as Record<string, unknown>;
  return (
    typeof cuadrilla.id_cuadrilla === "number" &&
    typeof cuadrilla.nombre_cuadrilla === "string" &&
    (typeof cuadrilla.zona_asignada === "string" || cuadrilla.zona_asignada === null)
  );
}

async function requestApi(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const responseText = await response.text();
  let data: unknown = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "mensaje" in data &&
      typeof data.mensaje === "string"
        ? data.mensaje
        : `Error del servidor (${response.status}).`;
    throw new Error(message);
  }

  return data;
}

export default function Cuadrillas() {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [form, setForm] = useState<CuadrillaForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadCuadrillas = useCallback(async () => {
    try {
      const data = await requestApi("/api/cuadrillas");
      if (!Array.isArray(data) || !data.every(isCuadrilla)) {
        throw new Error("El servidor devolvió una lista de cuadrillas inválida.");
      }
      setCuadrillas(data);
      setErrorMsg("");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Error al obtener las cuadrillas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    requestApi("/api/cuadrillas")
      .then((data) => {
        if (!Array.isArray(data) || !data.every(isCuadrilla)) {
          throw new Error("El servidor devolvió una lista de cuadrillas inválida.");
        }
        if (active) {
          setCuadrillas(data);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMsg(error instanceof Error ? error.message : "Error al obtener las cuadrillas.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await requestApi(
        editingId === null ? "/api/cuadrillas" : `/api/cuadrillas/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          body: JSON.stringify({
            nombre_cuadrilla: form.nombre_cuadrilla.trim(),
            zona_asignada: form.zona_asignada.trim() || null,
          }),
        }
      );
      setSuccessMsg(
        editingId === null
          ? "Cuadrilla creada correctamente."
          : "Cuadrilla actualizada correctamente."
      );
      resetForm();
      setLoading(true);
      await loadCuadrillas();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "No se pudo guardar la cuadrilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cuadrilla: Cuadrilla) => {
    setEditingId(cuadrilla.id_cuadrilla);
    setForm({
      nombre_cuadrilla: cuadrilla.nombre_cuadrilla,
      zona_asignada: cuadrilla.zona_asignada ?? "",
    });
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleDelete = async (cuadrilla: Cuadrilla) => {
    if (!window.confirm(`¿Eliminar la cuadrilla "${cuadrilla.nombre_cuadrilla}"?`)) {
      return;
    }

    setDeletingId(cuadrilla.id_cuadrilla);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await requestApi(`/api/cuadrillas/${cuadrilla.id_cuadrilla}`, { method: "DELETE" });
      setSuccessMsg("Cuadrilla eliminada correctamente.");
      if (editingId === cuadrilla.id_cuadrilla) {
        resetForm();
      }
      setLoading(true);
      await loadCuadrillas();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "No se pudo eliminar la cuadrilla.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Gestión de Cuadrillas</h1>
          <p className="mt-2 text-base text-stone-300">
            Administra los equipos de trabajo y las zonas de la finca.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setErrorMsg("");
            void loadCuadrillas();
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-stone-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar lista
        </button>
      </div>

      {successMsg && (
        <div role="status" className="mt-5 flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/20 px-4 py-3 text-sm text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur-md lg:col-span-1"
        >
          <h2 className="mb-4 text-xl font-medium">
            {editingId === null ? "Nueva Cuadrilla" : "Editar Cuadrilla"}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre_cuadrilla" className="mb-1.5 block text-sm font-medium text-stone-200">
                Nombre del equipo
              </label>
              <input
                id="nombre_cuadrilla"
                value={form.nombre_cuadrilla}
                onChange={(event) => setForm((current) => ({ ...current, nombre_cuadrilla: event.target.value }))}
                disabled={saving}
                required
                maxLength={100}
                placeholder="Ej. Los Halcones"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="zona_asignada" className="mb-1.5 block text-sm font-medium text-stone-200">
                Zona asignada
              </label>
              <input
                id="zona_asignada"
                value={form.zona_asignada}
                onChange={(event) => setForm((current) => ({ ...current, zona_asignada: event.target.value }))}
                disabled={saving}
                required
                maxLength={100}
                placeholder="Ej. Zona Norte"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 font-medium text-stone-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {editingId === null ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {editingId === null ? "Registrar" : "Guardar cambios"}
                </>
              )}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm text-stone-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md lg:col-span-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-stone-300">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Cargando cuadrillas...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-white/15 bg-black/30 text-stone-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Zona</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {cuadrillas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-stone-400">
                        No hay cuadrillas registradas.
                      </td>
                    </tr>
                  ) : (
                    cuadrillas.map((cuadrilla) => (
                      <tr key={cuadrilla.id_cuadrilla} className="text-stone-100 transition hover:bg-white/5">
                        <td className="px-4 py-3 text-stone-400">{cuadrilla.id_cuadrilla}</td>
                        <td className="px-4 py-3 font-medium">{cuadrilla.nombre_cuadrilla}</td>
                        <td className="px-4 py-3">{cuadrilla.zona_asignada || "Sin asignar"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(cuadrilla)}
                              disabled={saving || deletingId !== null}
                              aria-label={`Editar ${cuadrilla.nombre_cuadrilla}`}
                              className="rounded p-1.5 text-stone-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                              title="Editar cuadrilla"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(cuadrilla)}
                              disabled={saving || deletingId !== null}
                              aria-label={`Eliminar ${cuadrilla.nombre_cuadrilla}`}
                              className="rounded p-1.5 text-stone-400 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                              title="Borrar cuadrilla"
                            >
                              {deletingId === cuadrilla.id_cuadrilla ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
