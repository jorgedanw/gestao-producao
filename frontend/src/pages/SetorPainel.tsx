import React, { useEffect, useMemo, useState } from "react";
import { fetchOps } from "../lib/api";
import { iniciarOp, finalizarOp, getApontStatus, ApontStatus } from "../lib/api";
import type { OpDTO } from "../types/op";

function dmy(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(+d)) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
function diasRestantes(s?: string) {
  if (!s) return Infinity;
  const V = new Date(s).setHours(0, 0, 0, 0);
  const H = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((V - H) / 86400000);
}

type Props = {
  setor: "Perfiladeira" | "Serralheria" | "Eixo" | "Pintura";
  modo?: "pintura"; // ativa regras especiais
};

export default function SetorPainel({ setor, modo }: Props) {
  const [ops, setOps] = useState<OpDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [operador, setOperador] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);

      // sempre AA,SS + roteiro para sabermos os setores
      const params: any = {
        de: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10), // janela “larga”
        ate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        filial: 1,
        status: "AA,SS",
        incluirRoteiro: 1,
        limit: 400,
      };
      const data = await fetchOps(params);

      // filtra por setor de interesse
      let base = data.filter((op: OpDTO) => {
        const lista = op.setoresSelecionados?.length
          ? op.setoresSelecionados
          : (op.roteiro || []).map((r) => r.setor);
        return lista?.includes(setor);
      });

      // regras especiais: Pintura só quando demais setores finalizados
      if (modo === "pintura" && base.length) {
        const statusApi = await getApontStatus(base.map((o) => o.numero));
        const mapa = new Map<number, ApontStatus>(statusApi.map(s => [s.numero, s]));
        base = base.filter((op) => {
          const st = mapa.get(op.numero)?.porSetor || {};
          // precisa ter “Pintura” no roteiro e os outros três finalizados
          const precisa = ["Perfiladeira", "Serralheria", "Eixo"];
          const okOutros = precisa.every((s) => st[s]?.finalizado);
          return okOutros;
        });
      }

      setOps(base);
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  // auto refresh a cada 15s
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setor, modo]);

  // junta status de apontamentos para saber o que já foi iniciado/finalizado
  const statusMap = useMemo(() => ({} as Record<number, ApontStatus["porSetor"]>), []);
  useEffect(() => {
    (async () => {
      if (!ops.length) return;
      const s = await getApontStatus(ops.map(o => o.numero));
      s.forEach(reg => (statusMap[reg.numero] = reg.porSetor));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops]);

  // separa em Fila (ABERTA) e Em execução (ENTRADA PARCIAL)
  const fila = useMemo(
    () =>
      ops
        .filter((o) => (o.status || "").toUpperCase() === "ABERTA")
        .sort((a, b) => {
          // ordena por previsão de início (fallback validade)
          const ai = new Date(a.datas?.previsaoInicio || a.datas?.validade || "").getTime();
          const bi = new Date(b.datas?.previsaoInicio || b.datas?.validade || "").getTime();
          return ai - bi;
        }),
    [ops]
  );
  const exec = useMemo(
    () =>
      ops
        .filter((o) => (o.status || "").toUpperCase() === "ENTRADA_PARCIAL")
        .sort((a, b) => {
          const ai = new Date(a.datas?.previsaoInicio || a.datas?.validade || "").getTime();
          const bi = new Date(b.datas?.previsaoInicio || b.datas?.validade || "").getTime();
          return ai - bi;
        }),
    [ops]
  );

  const Card: React.FC<{ op: OpDTO }> = ({ op }) => {
    const v = op.datas?.validade;
    const dd = diasRestantes(v);
    const warn = dd <= 5 && dd > 3;
    const danger = dd <= 3;

    const st = statusMap[op.numero]?.[setor] || {};
    const jaIniciada = !!st.iniciado;
    const jaFinalizada = !!st.finalizado;

    return (
      <article
        className={[
          "card p-3 mb-3",
          warn ? "border-amber-300 bg-amber-50/50" : "",
          danger ? "border-red-300 bg-red-50/60" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="font-semibold">OP {op.numero}</div>
          <div className="text-sm text-gray-600">
            Emissão: {dmy(op.datas?.emissao)} • Prev. início: {dmy(op.datas?.previsaoInicio)} •{" "}
            <span className={danger ? "text-red-600 font-medium" : warn ? "text-amber-600" : ""}>
              Validade: {dmy(v)} {isFinite(dd) ? `(${dd}d)` : ""}
            </span>
          </div>
        </div>

        <div className="text-sm mt-1 truncate">{op.descricao || "—"}</div>

        <div className="mt-2 flex items-center gap-2">
          {!jaFinalizada && (
            <button
              className="btn btn-secondary"
              disabled={jaIniciada}
              onClick={async () => {
                await iniciarOp(op.numero, setor, operador || "operador");
                carregar();
              }}
            >
              Iniciar
            </button>
          )}

          {!jaFinalizada && (
            <button
              className="btn btn-primary"
              disabled={!jaIniciada}
              onClick={async () => {
                const m2 =
                  modo === "pintura"
                    ? Number(prompt("m² finalizados (opcional):", "0") || 0)
                    : undefined;
                await finalizarOp(op.numero, setor, operador || "operador", { m2 });
                carregar();
              }}
            >
              Finalizar
            </button>
          )}

          {jaFinalizada && <span className="text-emerald-700 text-sm">Finalizada</span>}
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Painel • {setor} {modo === "pintura" ? "(Pintura)" : ""}
        </h2>
        <div className="flex items-center gap-2">
          <input
            className="input w-44"
            placeholder="Operador"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            title="Nome do operador para registrar nos apontamentos"
          />
          <button className="btn" onClick={carregar} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </header>

      {erro && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">{erro}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Fila (ABERTAS)</h3>
            <span className="text-sm text-gray-500">{fila.length} OPs</span>
          </div>
          {fila.map((op) => (
            <Card key={op.numero} op={op} />
          ))}
          {!fila.length && <p className="text-sm text-gray-500">Sem OPs na fila.</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Em execução (ENTRADA PARCIAL)</h3>
            <span className="text-sm text-gray-500">{exec.length} OPs</span>
          </div>
          {exec.map((op) => (
            <Card key={op.numero} op={op} />
          ))}
          {!exec.length && <p className="text-sm text-gray-500">Sem OPs em execução.</p>}
        </div>
      </div>
    </section>
  );
}
