// src/pages/setores/SetorBase.tsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchOps } from "../../lib/api";
import { defaultWindow } from "../../lib/date";
import type { OpDTO } from "../../types/op";
import { Progress } from "../../components/Progress";

/* ------------------------ utilitários ------------------------ */
type Ordenacao = "prev" | "validade";
const setoresFixos = ["Perfiladeira", "Serralheria", "Eixo"] as const;

function ymdToMs(ymd?: string | null) {
  if (!ymd) return Number.POSITIVE_INFINITY;
  const s = ymd.slice(0, 10);
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, (M || 1) - 1, D || 1).getTime();
}
function formatDMY(ymd?: string | null) {
  if (!ymd) return "—";
  const s = ymd.slice(0, 10);
  const [Y, M, D] = s.split("-");
  return `${D}-${M}-${Y}`;
}
function daysLeft(ymd?: string | null) {
  if (!ymd) return Number.POSITIVE_INFINITY;
  const ms = ymdToMs(ymd);
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.ceil((ms - base) / 86400000);
}
function alertClasses(ymd?: string | null) {
  const d = daysLeft(ymd);
  if (d <= 3) return "ring-2 ring-red-300 bg-red-50";
  if (d <= 5) return "ring-1 ring-amber-300 bg-amber-50";
  return "";
}
function calcProgress(op: OpDTO): number {
  if (typeof op.progressoCalculado === "number") return op.progressoCalculado;
  const total = op.quant?.totalItens ?? op.quant?.totalHdr ?? 0;
  const saldo = op.quant?.saldoItens ?? op.quant?.saldoHdr ?? 0;
  if (!total) return 0;
  return (1 - saldo / total) * 100;
}
function hasSetor(op: OpDTO, setor: string) {
  const lista =
    (op.setoresSelecionados?.length ? op.setoresSelecionados : (op.roteiro || []).map((r) => r.setor)) || [];
  return lista.includes(setor);
}

/* ------------------- apontamentos (local) ------------------- */
type ApontMap = {
  [setor: string]: {
    [opNumero: string]: { startedAt?: string; finishedAt?: string };
  };
};
const APONT_KEY = "apontamentos-v1";
const loadApont = (): ApontMap => {
  try {
    const raw = localStorage.getItem(APONT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const saveApont = (m: ApontMap) => localStorage.setItem(APONT_KEY, JSON.stringify(m));

/* --------------------------- componente --------------------------- */
export default function SetorBase({
  setor: setorInicial,
  ordenarPor = "prev", // "prev" = previsão de início (padrão) | "validade"
}: {
  setor: (typeof setoresFixos)[number];
  ordenarPor?: Ordenacao;
}) {
  const jan = defaultWindow();

  const [setor, setSetor] = useState<(typeof setoresFixos)[number]>(setorInicial);
  const [ops, setOps] = useState<OpDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [apont, setApont] = useState<ApontMap>(() => loadApont());
  const [auto, setAuto] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchOps({
        de: jan.de,
        ate: jan.ate,
        filial: 1,
        status: "AA,SS", // uma fila: ABERTAS e EM EXECUÇÃO juntas
        incluirRoteiro: 1,
        limit: 400,
      });
      setOps(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setor]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(carregar, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, setor]);

  const iniciar = (numero: number) => {
    setApont((prev) => {
      const next = { ...prev, [setor]: { ...(prev[setor] || {}) } };
      next[setor][String(numero)] = { ...(next[setor][String(numero)] || {}), startedAt: new Date().toISOString() };
      saveApont(next);
      return next;
    });
  };
  const finalizar = (numero: number) => {
    setApont((prev) => {
      const next = { ...prev, [setor]: { ...(prev[setor] || {}) } };
      next[setor][String(numero)] = { ...(next[setor][String(numero)] || {}), finishedAt: new Date().toISOString() };
      saveApont(next);
      return next;
    });
  };

  /* ---------------------- fila única ordenada ---------------------- */
  const fila = useMemo(() => {
    let list = ops.filter((op) => hasSetor(op, setor));
    // some da fila se já finalizada nesse setor
    list = list.filter((op) => !apont[setor]?.[String(op.numero)]?.finishedAt);

    const sortKey = (op: OpDTO) =>
      ordenarPor === "prev" ? ymdToMs(op.datas?.previsaoInicio) : ymdToMs(op.datas?.validade);

    // fila única, ordenada
    list.sort((a, b) => sortKey(a) - sortKey(b));

    return list;
  }, [ops, setor, apont, ordenarPor]);

  /* ------------------------------ UI ------------------------------ */
  return (
    <section className="space-y-4">
      <header className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Painel por Setor</h3>
            <p className="text-xs text-gray-600">Fila única (ABERTAS e EM EXECUÇÃO), ordenada por {ordenarPor === "prev" ? "previsão de início" : "validade"}.</p>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm inline-flex items-center gap-2">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              Auto-atualizar (15s)
            </label>

            <div>
              <label className="label">Setor</label>
              <select
                className="select"
                value={setor}
                onChange={(e) => setSetor(e.target.value as (typeof setoresFixos)[number])}
              >
                {setoresFixos.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {err && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {/* FILA ÚNICA EMPILHADA */}
      <section className="grid gap-3">
        {fila.map((op) => (
          <OpCard key={op.numero} op={op} setor={setor} onIniciar={iniciar} onFinalizar={finalizar} />
        ))}
        {!fila.length && <div className="text-sm text-gray-500">Sem OPs para o setor selecionado.</div>}
      </section>
    </section>
  );
}

/* ----------------------- card de OP (empilhado) ----------------------- */
function OpCard({
  op,
  setor,
  onIniciar,
  onFinalizar,
}: {
  op: OpDTO;
  setor: string;
  onIniciar: (n: number) => void;
  onFinalizar: (n: number) => void;
}) {
  const prog = Math.round(calcProgress(op));
  const validade = op.datas?.validade;
  const dias = daysLeft(validade);
  const badge = dias !== Number.POSITIVE_INFINITY ? ` (${dias}d)` : "";

  // estado local de apontamento (somente leitura)
  const apontRaw = (() => {
    try {
      return JSON.parse(localStorage.getItem("apontamentos-v1") || "{}");
    } catch {
      return {};
    }
  }) as any;
  const started = Boolean(apontRaw?.[setor]?.[String(op.numero)]?.startedAt);
  const finished = Boolean(apontRaw?.[setor]?.[String(op.numero)]?.finishedAt);

  return (
    <article className={`card p-3 ${alertClasses(validade)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">OP {op.numero}</span>
          <span className="badge bg-blue-100 text-blue-700">{(op.status || "").replace(/_/g, " ")}</span>
          {op.cor && <span className="badge bg-purple-100 text-purple-700">Cor: {op.cor}</span>}
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          Emissão: {formatDMY(op.datas?.emissao)} • Prev. início: {formatDMY(op.datas?.previsaoInicio)} •{" "}
          <span className="font-medium text-red-600">
            Validade: {formatDMY(validade)}
            {badge}
          </span>
        </div>
      </div>

      {op.descricao && <div className="text-sm text-gray-800 mt-1">{op.descricao}</div>}

      <div className="mt-2">
        <Progress value={prog} />
        <div className="text-xs text-gray-600 mt-1">
          Progresso: <strong>{prog}%</strong>
          {op.quant?.totalItens !== undefined && (
            <> • Itens: {op.quant?.produzidasItens ?? 0}/{op.quant?.totalItens}</>
          )}
        </div>
      </div>

      {!!(op.setoresSelecionados?.length || op.roteiro?.length) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(op.setoresSelecionados?.length ? op.setoresSelecionados : (op.roteiro || []).map((r) => r.setor)).map(
            (s, i) => (
              <span key={s + i} className="badge bg-gray-100 text-gray-700">
                {s}
              </span>
            )
          )}
        </div>
      )}

      {!!op.roteiro?.length && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-blue-600">Ver roteiro (ordem)</summary>
          <ol className="mt-1 list-decimal ml-6 text-sm">
            {op.roteiro.map((r, i) => (
              <li key={i}>
                {r.setor} {r.ordem ? `(ordem ${r.ordem})` : ""}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="mt-3 flex gap-2">
        <button
          className="btn btn-secondary"
          disabled={started || finished}
          onClick={() => onIniciar(op.numero)}
          title={started ? "Já iniciado" : "Iniciar OP"}
        >
          Iniciar
        </button>
        <button
          className="btn btn-primary"
          disabled={!started || finished}
          onClick={() => onFinalizar(op.numero)}
          title={!started ? "Inicie antes de finalizar" : "Finalizar OP"}
        >
          Finalizar
        </button>
      </div>
    </article>
  );
}
