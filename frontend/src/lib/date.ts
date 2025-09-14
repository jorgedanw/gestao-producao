export function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// janela padrão: hoje-7 até hoje+21 (igual ao backend “fixo”)
export function defaultWindow() {
  const now = new Date();
  const de = new Date(now);
  de.setDate(now.getDate() - 7);
  const ate = new Date(now);
  ate.setDate(now.getDate() + 21);
  return { de: toISO(de), ate: toISO(ate) };
}
