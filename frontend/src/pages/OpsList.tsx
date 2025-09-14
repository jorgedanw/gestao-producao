import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchOps } from "../lib/api";
import { defaultWindow, formatBR } from "../lib/date";
import type { OP } from "../types/op";
import { Progress } from "../components/Progress";
import { StatusTag } from "../components/StatusTag";

/** ---------------------- Multi select de Status (AA/SS) ---------------------- */
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

  const selectAll = () => onChangeCsv(STATUS_OPTIONS.map((s) => s.code).join(","));
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

/** ----------------------------- Página ------------------------------ */
export default function OpsListPage() {
  const w = defaultWindow();

  // Filtros
  const [de, setDe] = useState(w.de);
  const [ate, setAte] = useState(w.ate);
  const [filial, setFilial] = useState(1);
  const [status, setStatus] = useState<string>("AA,SS"); // default: ABERTA + ENTRADA PARCIAL
  const [incluirRoteiro, setIncluirRoteiro] = useState(true);
  const [limit, setLimit] = useState(50);

  // Dados
  const [ops, setOps] = useState<OP[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const data = await fetchOps({ de, ate, filial, status, incluirRoteiro, limit });
      setOps(data);
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOps = ops.length;
  const mediaProgresso = useMemo(() => {
    if (!ops.length) return 0;
    return Math.round(ops.reduce((acc, o) => acc + (o.progressoCalculado ?? 0), 0) / ops.length);
  }, [ops]);

  return (
    <div className="container-page py-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lista de OPs</h1>
          <p className="text-gray-600 text-sm">
            Consome o endpoint <code>/integracao/ops-param</code>.
          </p>
        </div>
        <div className="card p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-xl font-semibold">{totalOps}</div>
          </div>
          <div className="col-span-3">
            <div className="text-xs text-gray-500 mb-1">Média de progresso</div>
            <Progress value={mediaProgresso} />
          </div>
        </div>
      </header>

      {/* Filtros */}
      <section className="card p-4">
        <div className="grid sm:grid-cols-6 gap-4">
          <div className="sm:col-span-2">
            <label className="label">De</label>
            <input type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Até</label>
            <input type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div>
            <label className="label">Filial</label>
            <input
              type="number"
              className="input"
              value={filial}
              onChange={(e) => setFilial(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="label">Status</label>
            <MultiStatusSelect valueCsv={status} onChangeCsv={setStatus} />
            <p className="text-[11px] text-gray-500 mt-1">
              Enviando: <code>{status || "—"}</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="chk-roteiro"
              type="checkbox"
              className="h-4 w-4"
              checked={incluirRoteiro}
              onChange={(e) => setIncluirRoteiro(e.target.checked)}
            />
            <label htmlFor="chk-roteiro" className="label m-0">
              Incluir Roteiro
            </label>
          </div>
          <div>
            <label className="label">Limite</label>
            <input
              type="number"
              className="input"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button onClick={load} disabled={loading} className="btn btn-primary w-full">
              {loading ? "Carregando..." : "Buscar OPs"}
            </button>
          </div>
        </div>
        {erro && <p className="text-red-600 mt-3">{erro}</p>}
      </section>

      {/* Lista */}
      <section className="grid gap-4">
        {ops.map((op) => (
          <article key={op.numero} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">OP {op.numero}</span>
                <StatusTag status={op.status} />
                {op.cor && <span className="badge bg-purple-100 text-purple-700">Cor: {op.cor}</span>}
              </div>
              <div className="text-sm text-gray-600">
                Emissão: {formatBR(op.datas.emissao)} • Prev. início: {formatBR(op.datas.previsaoInicio)} • Validade:{" "}
                {formatBR(op.datas.validade)}
              </div>
            </div>

            {/* Descrição */}
            {op.descricao && (
              <p className="mt-2 text-sm text-gray-700">
                {op.descricao}
              </p>
            )}

            <div className="mt-3">
              <Progress value={op.progressoCalculado || 0} />
              <div className="text-xs text-gray-600 mt-1">
                Progresso: <strong>{Math.round(op.progressoCalculado || 0)}%</strong>
                {op.quant.totalItens !== undefined && (
                  <> • Itens: {op.quant.produzidasItens ?? 0}/{op.quant.totalItens}</>
                )}
              </div>
            </div>

            {op.setoresSelecionados.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {op.setoresSelecionados.map((s, i) => (
                  <span key={s + i} className="badge bg-gray-100 text-gray-700">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {incluirRoteiro && op.roteiro.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-blue-600">Ver roteiro (ordem)</summary>
                <ol className="mt-2 list-decimal ml-6 text-sm">
                  {op.roteiro.map((r, i) => (
                    <li key={i}>
                      {r.setor} {r.ordem ? `(ordem ${r.ordem})` : ""}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </article>
        ))}

        {!loading && ops.length === 0 && (
          <div className="text-center text-gray-500 py-6">Nenhuma OP para os filtros informados.</div>
        )}
      </section>
    </div>
  );
}
