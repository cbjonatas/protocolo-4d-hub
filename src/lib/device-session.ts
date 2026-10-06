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
 * Retorna:
 * - "ok": sessão registrada com sucesso
 * - "conflict": já existe outra sessão ativa e force = false
 * - "error": falha na comunicação ou autenticação
 */
export async function claimDeviceSession(force = false): Promise<"ok" | "conflict" | "error"> {
  const deviceId = getDeviceId();
  if (!deviceId) return force ? "error" : "ok";
  try {
    const { data, error } = await supabase.rpc("claim_user_session", {
      p_device_id: deviceId,
      p_force: force,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
    if (error) {
      console.error("[claimDeviceSession] Erro RPC Supabase:", error);
      return force ? "error" : "ok";
    }
    return data === "conflict" ? "conflict" : "ok";
  } catch (err) {
    console.error("[claimDeviceSession] Exceção:", err);
    return force ? "error" : "ok";
  }
}

/** Confirma se este dispositivo ainda é a sessão ativa e atualiza a última atividade. */
export async function validateDeviceSession(): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return true;
  try {
    const { data, error } = await supabase.rpc("validate_user_session", {
      p_device_id: deviceId,
    });
    if (error) {
      console.error("[validateDeviceSession] Erro RPC Supabase:", error);
      return true; // Não bloqueia o aluno por instabilidade transitória de rede
    }
    return data === true;
  } catch (err) {
    console.error("[validateDeviceSession] Exceção:", err);
    return true;
  }
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

