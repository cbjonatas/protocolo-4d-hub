import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "p4d_device_id";

/** Identificador único e persistente deste dispositivo/navegador. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Registra este dispositivo como a sessão ativa do usuário.
 * Retorna "conflict" quando já existe outra sessão ativa e force = false.
 */
export async function claimDeviceSession(force = false): Promise<"ok" | "conflict"> {
  const deviceId = getDeviceId();
  if (!deviceId) return "ok";
  const { data, error } = await supabase.rpc("claim_user_session", {
    p_device_id: deviceId,
    p_force: force,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  });
  if (error) return "ok"; // nunca bloquear o acesso por falha de infraestrutura
  return data === "conflict" ? "conflict" : "ok";
}

/** Confirma se este dispositivo ainda é a sessão ativa e atualiza a última atividade. */
export async function validateDeviceSession(): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return true;
  const { data, error } = await supabase.rpc("validate_user_session", {
    p_device_id: deviceId,
  });
  if (error) return true;
  return data === true;
}

/** Encerra a sessão deste dispositivo (logout), liberando a conta. */
export async function releaseDeviceSession(): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await supabase.rpc("release_user_session", { p_device_id: deviceId });
  } catch {
    /* ignorar */
  }
}
