// Armazena: início/fim por OP+setor, logs de pintura (m²/dia) e posições de expedição.
// Persistência simples em um JSON local (.data/exec-store.json).

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "exec-store.json");

type Setor =
  | "Perfiladeira"
  | "Serralheria"
  | "Eixo"
  | "Pintura"
  | "Expedição";

export type ExecStatus = "queued" | "started" | "finished";

export interface ExecEntry {
  op: number;
  setor: Setor;
  status: ExecStatus;
  operador?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface PinturaLog {
  op: number;
  data: string; // YYYY-MM-DD
  m2: number;
  operador?: string;
}

export interface ExpedicaoLoc {
  op: number;
  operador?: string;
  corredor?: string;   // A-Z
  prateleira?: number; // 1-10
  obs?: string;
  updatedAt: string;
}

type Store = {
  exec: Record<string, ExecEntry>;      // key: `${op}_${setor}`
  pintura: PinturaLog[];                // logs
  expedicao: Record<number, ExpedicaoLoc>; // por OP
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify(<Store>{ exec:{}, pintura:[], expedicao:{} }, null, 2));
}

function read(): Store {
  ensureFile();
  return JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
}
function write(data: Store) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function key(op: number, setor: Setor) { return `${op}_${setor}`; }

export const ExecStore = {
  get(op: number, setor: Setor): ExecEntry | undefined {
    return read().exec[key(op, setor)];
  },
  setStart(op: number, setor: Setor, operador?: string) {
    const db = read();
    const k = key(op, setor);
    const prev = db.exec[k];
    db.exec[k] = {
      op, setor,
      status: "started",
      operador: operador ?? prev?.operador,
      startedAt: prev?.startedAt ?? new Date().toISOString(),
    };
    write(db);
    return db.exec[k];
  },
  setFinish(op: number, setor: Setor) {
    const db = read();
    const k = key(op, setor);
    const prev = db.exec[k] ?? { op, setor, status: "queued" as ExecStatus };
    db.exec[k] = {
      ...prev,
      status: "finished",
      finishedAt: new Date().toISOString(),
    };
    write(db);
    return db.exec[k];
  },
  listByOp(op: number) {
    const db = read();
    return Object.values(db.exec).filter(e => e.op === op);
  },

  // Pintura
  addPinturaLog(log: PinturaLog) {
    const db = read();
    db.pintura.push(log);
    write(db);
  },
  sumPintado(op: number) {
    const db = read();
    return db.pintura.filter(p => p.op === op).reduce((s, x) => s + x.m2, 0);
  },
  listPintura(op?: number) {
    const db = read();
    return op ? db.pintura.filter(p => p.op === op) : db.pintura;
  },

  // Expedição
  setExpLoc(loc: ExpedicaoLoc) {
    const db = read();
    db.expedicao[loc.op] = { ...db.expedicao[loc.op], ...loc, updatedAt: new Date().toISOString() };
    write(db);
    return db.expedicao[loc.op];
  },
  getExpLoc(op: number) {
    const db = read();
    return db.expedicao[op];
  }
};
