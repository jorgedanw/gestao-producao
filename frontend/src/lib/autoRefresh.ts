import { useEffect, useState } from "react";

const KEY = "gp:autoRefresh";

/** Lê o estado salvo (default: false) */
function readAuto(): boolean {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "false");
  } catch {
    return false;
  }
}

/** Salva e notifica outras abas/componentes */
function writeAuto(v: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
    window.dispatchEvent(new CustomEvent("gp:autoRefresh-change", { detail: v }));
  } catch {}
}

/**
 * Hook de auto-atualização compartilhado.
 * - Persiste no localStorage
 * - Reage a mudanças vindas de outras abas/componentes
 * - Dispara `tick()` a cada `intervalMs`
 */
export function useAutoRefresh(
  tick: () => void,
  deps: any[] = [],
  intervalMs = 15_000
) {
  const [auto, setAuto] = useState<boolean>(() => readAuto());

  // Persistir quando o usuário mudar
  useEffect(() => {
    writeAuto(auto);
  }, [auto]);

  // Sincronizar quando mudar em outra aba/componente
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setAuto(readAuto());
    };
    const onCustom = () => setAuto(readAuto());

    window.addEventListener("storage", onStorage);
    window.addEventListener("gp:autoRefresh-change", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("gp:autoRefresh-change", onCustom as EventListener);
    };
  }, []);

  // Intervalo
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => tick(), intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, intervalMs, ...deps]);

  return { auto, setAuto };
}
