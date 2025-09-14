import React, { useEffect, useMemo, useState } from "react";
import { fetchOps } from "../lib/api";
import { defaultWindow } from "../lib/date";
import type { OpDTO } from "../types/op";

/* ---------------------- Status (nomes → códigos) ----------------------- */
const STATUS_OPTIONS = [
  { name: "ABERTA", codes: ["AA"] },
  { name: "INICIADA", codes: ["SS"] },
  { name: "ENTRADA_PARCIAL", codes: ["EP"] },
  { name: "FINALIZADA", codes: ["FN", "FF", "FC"] },
] as const;

type StatusName = (typeof STATUS_OPTIONS)[number]["name"];
const codesFromName = (name: StatusName) =>
  STATUS_OPTIONS.find((o) => o.name === name)?.codes.join(",") ?? "";

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

/* ------------------------------ Tipos ---------------------------------- */
type Filtros = {
  de: string;
  ate: string;
  filial: number;
  incluirRoteiro: boolean;
  limit: number;
};

/* ------------------------------ Página --------------------------------- */
export default function Paineis() {
  const jan = defaultWindow();

  const [filtros, setFiltros] = useState<Filtros>({
    de: jan.de,
    ate: jan.ate,
    filial: 1,
    incluirRoteiro: true,
    limit: 200,
  });

  const [statusName, setStatusName] = useState<StatusName>("ABERTA");
  const [auto, setAuto] = useState(false);
  const [ops, setOps] = useState<OpDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function carregar() {
    try {
      setLoading(true);
      setErr(null);
      const params = {
        de: filtros.de,
        ate: filtros.ate,
        filial: filtros.filial,
        status: codesFromName(statusName),
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
  }, [auto, filtros, statusName]);

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

        {/* Combobox de status */}
        <div className="lg:col-span-4">
          <label className="label block">Status</label>
          <select
            className="select"
            value={statusName}
            onChange={(e) => setStatusName(e.target.value as StatusName)}
            title="Selecione o status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.name} value={opt.name}>
                {opt.name.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-gray-500 mt-1">
            Enviando: <code>{codesFromName(statusName)}</code>
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

      {/* Barras por Status */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-medium mb-3">Distribuição por Status</h3>
        <div className="space-y-2">
          {kpis.porStatus.map((row) => (
            <div key={row.status} className="flex items-center gap-3">
              <div className="w-40 text-sm text-gray-700">{row.status}</div>
              <div className="flex-1 h-3 bg-slate-100 rounded">
                <div
                  className="h-3 rounded bg-blue-600"
                  style={{ width: `${(row.qtde / maxStatus) * 100}%` }}
                  title={`${row.qtde} OPs`}
                />
              </div>
              <div className="w-10 text-right text-sm">{row.qtde}</div>
            </div>
          ))}
          {!kpis.porStatus.length && (
            <div className="text-sm text-gray-500">Sem dados.</div>
          )}
        </div>
      </section>

      {/* Barras por Setor */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-medium mb-3">Participação por Setor</h3>
        <div className="space-y-2">
          {kpis.porSetor.map((row) => (
            <div key={row.setor} className="flex items-center gap-3">
              <div className="w-40 text-sm text-gray-700">{row.setor}</div>
              <div className="flex-1 h-3 bg-slate-100 rounded">
                <div
                  className="h-3 rounded bg-emerald-600"
                  style={{ width: `${(row.qtde / maxSetor) * 100}%` }}
                  title={`${row.qtde} OPs`}
                />
              </div>
              <div className="w-10 text-right text-sm">{row.qtde}</div>
            </div>
          ))}
          {!kpis.porSetor.length && (
            <div className="text-sm text-gray-500">Sem dados.</div>
          )}
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
                    <td className="py-2 pr-4">{op.status ?? "—"}</td>
                    <td className="py-2 pr-4">{op.datas?.validade ?? "—"}</td>
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
