import fs from "fs";
import path from "path";

type Registro = {
  numero: number;
  setor: string;
  operador?: string;
  iniciadoEm?: string;
  finalizadoEm?: string;
  m2?: number;
  obs?: string;
};

type PorOp = Record<
  number,
  {
    porSetor: Record<string, { iniciado?: string; finalizado?: string; m2?: number; historico: Registro[] }>;
  }
>;

const FILE = path.join(process.cwd(), "data", "apontamentos.json");

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({} as PorOp, null, 2));
}
function load(): PorOp {
  ensureFile();
  return JSON.parse(fs.readFileSync(FILE, "utf8") || "{}");
}
function save(db: PorOp) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function apontarIniciar(numero: number, setor: string, operador?: string) {
  const db = load();
  const entry = (db[numero] ||= { porSetor: {} });
  const s = (entry.porSetor[setor] ||= { historico: [] as Registro[] });
  const now = new Date().toISOString();
  s.iniciado = now;
  s.historico.push({ numero, setor, operador, iniciadoEm: now });
  save(db);
  return entry;
}

export function apontarFinalizar(numero: number, setor: string, operador?: string, m2?: number, obs?: string) {
  const db = load();
  const entry = (db[numero] ||= { porSetor: {} });
  const s = (entry.porSetor[setor] ||= { historico: [] as Registro[] });
  const now = new Date().toISOString();
  s.finalizado = now;
  if (typeof m2 === "number") s.m2 = (s.m2 || 0) + m2;
  s.historico.push({ numero, setor, operador, finalizadoEm: now, m2, obs });
  save(db);
  return entry;
}

export function statusPorNumeros(numeros: number[]) {
  const db = load();
  return numeros.map((n) => ({ numero: n, porSetor: db[n]?.porSetor || {} }));
}
