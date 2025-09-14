import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchOps } from "../lib/api";
import { defaultWindow, formatBR } from "../lib/date";
import type { OpDTO } from "../types/op";
import { Progress } from "../components/Progress";

/* -------------------- Persistência -------------------- */
const AUTO_KEY = "gp:autoRefresh";                // '1' | '0'
const FILTROS_KEY = "gp:paineis:filtros";         // JSON

/* -------------------- Combobox de Status (AA/SS) -------------------- */
const STATUS_OPTIONS = [
  { code: "AA", label: "ABERTA" },
  { code: "SS", label: "ENTRADA PARCIAL" },
] as const;

function MultiStatusSelect({
  valueCsv,
  onChangeCsv,
}: {
  valueCsv: string;
  onChangeCsv: (csv: string) => void;
}) {
  const selected = new Set(
    valueCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggle = (code: string) => {
    const n = new Set(selected);
    if (n.has(code)) n.delete(code);
    else n.add(code);
    onChangeCsv(Array.from(n).join(","));
  };

  const selectAll = () =>
    onChangeCsv(STATUS_OPTIONS.map((s) => s.code).join(","));
  const clearAll = () => onChangeCsv("");

  const allMarked = STATUS_OPTIONS.every((o) => selected.has(o.code));
  const text =
    selected.size === 0
      ? "—"
      : allMarked
      ? "Todos"
      : STATUS_OPTIONS.filter((o) => selected.has(o.code))
          .map((o) => o.label)
          .join(", ");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input text-left truncate"
        title={text}
      >
        {text}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-[22rem] max-w-[calc(100vw-3rem)] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 max-h-72 overflow-auto">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={selectAll}
              >
                Selecionar todos
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                onClick={clearAll}
              >
                Limpar
              </button>
            </div>

            <ul className="space-y-1">
              {STATUS_OPTIONS.map((opt) => (
                <li key={opt.code}>
                  <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.has(opt.code)}
                      onChange={() => toggle(opt.code)}
                    />
                    <span className="text-sm text-gray-800">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 p-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-primary px-3 py-1.5"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------- utilidades/kpis ------------------------- */
const toPct = (n: number) => (Number.isFinite(n) ? `${Math.round(n)}%` : "0%");
const hojeISO = () => new Date().toISOString().slice(0, 10);
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

function calcProgress(op: OpDTO): number {
  if (typeof op.progressoCalculado === "number") return op.progressoCalculado;
  const total = op.quant?.totalItens ?? op.quant?.totalHdr ?? 0;
  const saldo = op.quant?.saldoItens ?? op.quant?.saldoHdr ?? 0;
  if (!total) return 0;
  return (1 - saldo / total) * 100;
}

function ts(d?: string | null): number {
  if (!d) return Number.POSITIVE_INFINITY;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const target = new Date(d);
  if (isNaN(+target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((+target - +today) / 86400000);
  return diff;
}

function deadlineClass(validade?: string | null): string {
  const days = daysUntil(validade);
  if (days === null) return "";
  if (days <= 3) return "border-red-300 bg-red-50";       // destaque forte
  if (days <= 5) return "border-amber-300 bg-amber-50";   // destaque suave
  return "";
}

/* ------------------------------ Tipos ---------------------------------- */
type Filtros = {
  de: string;
  ate: string;
  filial: number;
  incluirRoteiro: boolean;
  limit: number;
};

/* ---------------- helpers de persistência ---------------- */
function loadPersisted(): {
  filtros: Filtros;
  statusCsv: string;
  setorSel: string;
  auto: boolean;
} {
  const jan = defaultWindow();
  let filtros: Filtros = {
    de: jan.de,
    ate: jan.ate,
    filial: 1,
    incluirRoteiro: true,
    limit: 200,
  };
  let statusCsv = "AA,SS";
  let setorSel = "";
  try {
    const raw = localStorage.getItem(FILTROS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      filtros = { ...filtros, ...parsed.filtros };
      statusCsv = typeof parsed.statusCsv === "string" ? parsed.statusCsv : statusCsv;
      setorSel = typeof parsed.setorSel === "string" ? parsed.setorSel : setorSel;
    }
  } catch {
    /* ignore */
  }
  const auto = localStorage.getItem(AUTO_KEY) !== "0"; // default true
  return { filtros, statusCsv, setorSel, auto };
}

/* ------------------------------ Página --------------------------------- */
export default function Paineis() {
  const persisted = loadPersisted();

  const [filtros, setFiltros] = useState<Filtros>(persisted.filtros);

  // Multi-seleção de status (CSV): AA,SS
  const [statusCsv, setStatusCsv] = useState<string>(persisted.statusCsv);

  // Filtro por setor (derivado do resultado): '' = Todos
  const [setorSel, setSetorSel] = useState<string>(persisted.setorSel);

  // Auto-refresh 15s com persistência
  const [auto, setAuto] = useState<boolean>(persisted.auto);

  const [ops, setOps] = useState<OpDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // persistir mudanças relevantes
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTROS_KEY,
        JSON.stringify({ filtros, statusCsv, setorSel })
      );
    } catch {
      /* ignore */
    }
  }, [filtros, statusCsv, setorSel]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, auto ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [auto]);

  async function carregar() {
    try {
      setLoading(true);
      setErr(null);
      const params = {
        de: filtros.de,
        ate: filtros.ate,
        filial: filtros.filial,
        status: statusCsv,
        limit: filtros.limit,
        incluirRoteiro: filtros.incluirRoteiro ? 1 : 0,
      } as any;
      const data = await fetchOps(params);
      setOps(data);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Falha ao buscar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(carregar, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, filtros, statusCsv, setorSel]);

  /* ---------------------------- KPIs ----------------------------------- */
  const kpis = useMemo(() => {
    if (!ops?.length) {
      return {
        total: 0,
        mediaProgresso: 0,
        porStatus: [] as { status: string; qtde: number }[],
        porSetor: [] as { setor: string; qtde: number }[],
        atrasadas: [] as OpDTO[],
      };
    }

    const total = ops.length;
    const mediaProgresso = ops.reduce((s, op) => s + calcProgress(op), 0) / total;

    const mapStatus = new Map<string, number>();
    ops.forEach((op) => {
      const st = (op.status || "—").toString();
      mapStatus.set(st, (mapStatus.get(st) ?? 0) + 1);
    });
    const porStatus = Array.from(mapStatus.entries())
      .map(([status, qtde]) => ({ status, qtde }))
      .sort((a, b) => b.qtde - a.qtde);

    const mapSetor = new Map<string, number>();
    ops.forEach((op) => {
      const setores =
        (op.setoresSelecionados && op.setoresSelecionados.length
          ? op.setoresSelecionados
          : (op.roteiro || []).map((r) => r.setor)) ?? [];
      uniq(setores).forEach((s) => mapSetor.set(s, (mapSetor.get(s) ?? 0) + 1));
    });
    const porSetor = Array.from(mapSetor.entries())
      .map(([setor, qtde]) => ({ setor, qtde }))
      .sort((a, b) => b.qtde - a.qtde);

    const hoje = hojeISO();
    const atrasadas = ops.filter((op) => (op.datas?.validade || "") < hoje);

    return { total, mediaProgresso, porStatus, porSetor, atrasadas };
  }, [ops]);

  const maxSetor = Math.max(1, ...kpis.porSetor.map((x) => x.qtde));
  const maxStatus = Math.max(1, ...kpis.porStatus.map((x) => x.qtde));

  /* --------- Painel por Setor (derivado do resultado atual) ------------ */
  const setoresDerivados = useMemo(() => {
    const all = new Set<string>();
    ops.forEach((op) => {
      const s1 = op.setoresSelecionados ?? [];
      const s2 = (op.roteiro ?? []).map((r) => r.setor);
      [...s1, ...s2].forEach((s) => {
        if (s && typeof s === "string") all.add(s.trim());
      });
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [ops]);

  const possuiSetor = (op: OpDTO, setor: string) => {
    if (!setor) return true; // Todos
    const alvo = setor.toLowerCase();
    const s1 = (op.setoresSelecionados ?? []).some(
      (s) => s?.toLowerCase() === alvo
    );
    const s2 = (op.roteiro ?? []).some((r) => r.setor?.toLowerCase() === alvo);
    return s1 || s2;
  };

  const opsFiltradas = useMemo(
    () => ops.filter((op) => possuiSetor(op, setorSel)),
    [ops, setorSel]
  );

  // listas, sempre ordenadas por validade (asc)
  const byVal = (a: OpDTO, b: OpDTO) =>
    ts(a.datas?.validade) - ts(b.datas?.validade);

  const filaAbertas = useMemo(
    () =>
      opsFiltradas
        .filter(
          (op) =>
            (op.status ?? "").toString().toUpperCase().includes("ABERTA") ||
            (op.status ?? "") === "AA"
        )
        .sort(byVal),
    [opsFiltradas]
  );

  const emExecucao = useMemo(
    () =>
      opsFiltradas
        .filter(
          (op) =>
            (op.status ?? "").toString().toUpperCase().includes("ENTRADA") ||
            (op.status ?? "") === "SS"
        )
        .sort(byVal),
    [opsFiltradas]
  );

  /* ----------------------------- Render -------------------------------- */
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Painéis</h2>
        <label className="text-sm inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />
          Auto-atualizar (15s)
        </label>
      </header>

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-2">
          <label className="label">De</label>
          <input
            type="date"
            className="input"
            value={filtros.de}
            onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="label">Até</label>
          <input
            type="date"
            className="input"
            value={filtros.ate}
            onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="label">Filial</label>
          <input
            type="number"
            min={1}
            className="input"
            value={filtros.filial}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, filial: Number(e.target.value) }))
            }
          />
        </div>

        {/* Combobox multi de status */}
        <div className="lg:col-span-4">
          <label className="label block">Status</label>
          <MultiStatusSelect valueCsv={statusCsv} onChangeCsv={setStatusCsv} />
          <div className="text-[11px] text-gray-500 mt-1">
            Enviando: <code>{statusCsv || "—"}</code>
          </div>
        </div>

        {/* Linha inferior dos filtros */}
        <div className="lg:col-span-2 flex items-end">
          <label className="text-sm inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filtros.incluirRoteiro}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, incluirRoteiro: e.target.checked }))
              }
            />
            Incluir roteiro
          </label>
        </div>

        <div className="lg:col-span-2">
          <label className="label">Limite</label>
          <input
            type="number"
            min={1}
            className="input w-28"
            value={filtros.limit}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, limit: Number(e.target.value) }))
            }
          />
        </div>

        <div className="lg:col-span-2 flex items-end">
          <button
            className="btn btn-primary w-full h-10"
            onClick={carregar}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {err && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {err}
        </div>
      )}

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total de OPs" value={kpis.total.toString()} />
        <KpiCard title="Média de progresso" value={toPct(kpis.mediaProgresso)} />
        <KpiCard
          title="Status (mais frequente)"
          value={kpis.porStatus[0]?.status ?? "—"}
          hint={`${kpis.porStatus[0]?.qtde ?? 0} OPs`}
        />
        <KpiCard
          title="Setor mais recorrente"
          value={kpis.porSetor[0]?.setor ?? "—"}
          hint={`${kpis.porSetor[0]?.qtde ?? 0} OPs`}
        />
      </div>

      {/* Painel por Setor */}
      <section className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-medium">Painel por Setor</h3>
            <p className="text-xs text-gray-500">
              Filtra com base no roteiro/setores selecionados das OPs retornadas.
            </p>
          </div>
          <div className="w-full sm:w-80">
            <label className="label">Setor</label>
            <select
              className="select"
              value={setorSel}
              onChange={(e) => setSetorSel(e.target.value)}
            >
              <option value="">Todos</option>
              {setoresDerivados.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Fila - ABERTAS */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Fila (ABERTAS)</h4>
              <span className="text-xs text-gray-500">{filaAbertas.length} OPs</span>
            </div>
            <div className="space-y-3">
              {filaAbertas.map((op) => {
                const hl = deadlineClass(op.datas?.validade);
                return (
                  <article key={op.numero} className={`rounded border p-3 ${hl}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium">
                          OP {op.numero}
                          {op.descricao ? (
                            <span
                              className="ml-2 text-xs text-gray-600 max-w-[28rem] truncate inline-block align-middle"
                              title={op.descricao}
                            >
                              {op.descricao}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-[11px] text-gray-500 mt-1">
                          Emissão: {formatBR(op.datas?.emissao)} • Prev. início:{" "}
                          {formatBR(op.datas?.previsaoInicio)} • Validade:{" "}
                          {formatBR(op.datas?.validade)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Progress value={calcProgress(op)} />
                    </div>
                  </article>
                );
              })}
              {!filaAbertas.length && (
                <p className="text-sm text-gray-500">Sem OPs abertas para este setor.</p>
              )}
            </div>
          </div>

          {/* Em execução - ENTRADA PARCIAL */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Em execução (ENTRADA PARCIAL)</h4>
              <span className="text-xs text-gray-500">{emExecucao.length} OPs</span>
            </div>
            <div className="space-y-3">
              {emExecucao.map((op) => {
                const hl = deadlineClass(op.datas?.validade);
                return (
                  <article key={op.numero} className={`rounded border p-3 ${hl}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium">
                          OP {op.numero}
                          {op.descricao ? (
                            <span
                              className="ml-2 text-xs text-gray-600 max-w-[28rem] truncate inline-block align-middle"
                              title={op.descricao}
                            >
                              {op.descricao}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-[11px] text-gray-500 mt-1">
                          Emissão: {formatBR(op.datas?.emissao)} • Prev. início:{" "}
                          {formatBR(op.datas?.previsaoInicio)} • Validade:{" "}
                          {formatBR(op.datas?.validade)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Progress value={calcProgress(op)} />
                    </div>
                  </article>
                );
              })}
              {!emExecucao.length && (
                <p className="text-sm text-gray-500">Sem OPs em execução para este setor.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Atrasadas */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-medium mb-3">OPs atrasadas (validade vencida)</h3>
        {kpis.atrasadas.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">OP</th>
                  <th className="py-2 pr-4">Descrição</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Validade</th>
                  <th className="py-2 pr-4">Progresso</th>
                  <th className="py-2 pr-4">Setores</th>
                </tr>
              </thead>
              <tbody>
                {kpis.atrasadas.map((op) => (
                  <tr key={op.numero} className="border-t">
                    <td className="py-2 pr-4 font-medium">OP {op.numero}</td>
                    <td
                      className="py-2 pr-4 max-w-[26rem] truncate"
                      title={op.descricao ?? ""}
                    >
                      {op.descricao ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{op.status ?? "—"}</td>
                    <td className="py-2 pr-4">{formatBR(op.datas?.validade)}</td>
                    <td className="py-2 pr-4">{toPct(calcProgress(op))}</td>
                    <td className="py-2 pr-4">
                      {(op.setoresSelecionados?.length
                        ? op.setoresSelecionados
                        : (op.roteiro || []).map((r) => r.setor)
                      )?.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma OP atrasada no período.</p>
        )}
      </section>
    </section>
  );
}

/* ----------------------- Componentes básicos --------------------------- */
function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}
