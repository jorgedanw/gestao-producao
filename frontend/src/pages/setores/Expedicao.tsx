import React, { useEffect, useMemo, useState } from "react";
import { fetchOps } from "../../lib/api";
import { getApontStatus } from "../../lib/api";
import type { OpDTO } from "../../types/op";

export default function Expedicao() {
  const [ops, setOps] = useState<OpDTO[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [operador, setOperador] = useState("");
  const [corredor, setCorredor] = useState("A");
  const [prateleira, setPrateleira] = useState(1);
  const [obs, setObs] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      const data = await fetchOps({
        de: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
        ate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        filial: 1,
        status: "AA,SS", // base
        incluirRoteiro: 1,
        limit: 400,
      } as any);

      // regra: aparece OP cuja Pintura esteja iniciada (ou OPs finalizadas sem pintura)
      const status = await getApontStatus(data.map((o: OpDTO) => o.numero));
      const mapa = new Map<number, any>(status.map((s) => [s.numero, s.porSetor]));
      const filtradas = data.filter((op: OpDTO) => {
        const st = mapa.get(op.numero) || {};
        const temPintura = (op.setoresSelecionados?.length
          ? op.setoresSelecionados
          : (op.roteiro || []).map((r) => r.setor)
        )?.includes("Pintura");

        if (temPintura) return !!st?.Pintura?.iniciado; // pintura iniciada
        // se não tem pintura, entra quando estiver finalizada em todos os demais setores
        const precisa = ["Perfiladeira", "Serralheria", "Eixo"].filter(Boolean);
        const ok = precisa.every((s) => !temPintura && st?.[s]?.finalizado);
        return ok;
      });

      setOps(filtradas);
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 15000);
    return () => clearInterval(id);
  }, []);

  const imprimirEtiqueta = (op: OpDTO) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <div style="font-family: Arial; padding: 12px">
        <h3 style="margin:0 0 6px 0">Etiqueta de Expedição</h3>
        <div><b>OP:</b> ${op.numero}</div>
        <div><b>Operador:</b> ${operador || "-"}</div>
        <div><b>Corredor:</b> ${corredor}</div>
        <div><b>Prateleira:</b> ${prateleira}</div>
        <div><b>Obs:</b> ${obs || "-"}</div>
        <hr/>
        <small>Gerado em ${new Date().toLocaleString()}</small>
      </div>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Expedição</h2>
        <button className="btn" onClick={carregar} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </header>

      <div className="card p-4 grid gap-3 md:grid-cols-4">
        <div>
          <label className="label">Operador</label>
          <input className="input" value={operador} onChange={(e) => setOperador(e.target.value)} />
        </div>
        <div>
          <label className="label">Corredor</label>
          <select className="select" value={corredor} onChange={(e) => setCorredor(e.target.value)}>
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Prateleira</label>
          <select
            className="select"
            value={prateleira}
            onChange={(e) => setPrateleira(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Observações</label>
          <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      {erro && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">{erro}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {ops.map((op) => (
          <article key={op.numero} className="card p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">OP {op.numero}</div>
              <button className="btn btn-primary" onClick={() => imprimirEtiqueta(op)}>
                Imprimir etiqueta
              </button>
            </div>
            <div className="text-sm text-gray-600 mt-1">{op.descricao || "—"}</div>
          </article>
        ))}
        {!ops.length && <p className="text-sm text-gray-500">Sem itens para expedição.</p>}
      </div>
    </section>
  );
}
