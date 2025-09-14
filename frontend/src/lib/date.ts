// frontend/src/lib/date.ts

/** yyyy-mm-dd de um Date (em UTC cortado) */
export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Janela padrão: de D-7 até D+21 */
export function defaultWindow() {
  const hoje = new Date();
  const d1 = new Date(hoje);
  d1.setDate(d1.getDate() - 7);
  const d2 = new Date(hoje);
  d2.setDate(d2.getDate() + 21);
  return { de: toISO(d1), ate: toISO(d2) };
}

/** Converte string de data (YYYY-MM-DD ou ISO) para DD-MM-YYYY */
export function formatBR(input?: string | null): string {
  if (!input) return "-";
  // aceita "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss"
  const s = String(input).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (y && m && d) return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  return String(input); // fallback: mostra cru se não reconhecer
}
