// src/pages/setores/Pintura.tsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchOps, getExecState, startExec, finishExec, postPinturaLog } from "../../lib/api";
import type { OpDTO } from "../../types/op";
import { Progress } from "../../components/Progress";
import { defaultWindow, fmtBr, daysTo } from "../../lib/date";

function badgeValidity(validade?: string){
  if (!validade) return null;
  const d = daysTo(validade);
  const tone = d<=3 ? "ring-2 ring-red-300 bg-red-50" : d<=5 ? "ring-2 ring-amber-200 bg-amber-50" : "bg-white";
  return { d, tone };
}
function groupBy<T, K extends string>(arr: T[], key: (x:T)=>K){
  return arr.reduce((acc, item) => { const k=key(item); (acc[k]||(acc[k]=[])).push(item); return acc; }, {} as Record<K,T[]>);
}

export default function Pintura() {
  const jan = defaultWindow();
  const [de, setDe] = useState(localStorage.getItem("p_pint_de")||jan.de);
  const [ate, setAte] = useState(localStorage.getItem("p_pint_ate")||jan.ate);
  const [filial, setFilial] = useState(1);
  const [ops, setOps] = useState<OpDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [operador, setOperador] = useState(localStorage.getItem("operador")||"");
  const [corFiltro, setCorFiltro] = useState<string>("");

  async function carregar() {
    setLoading(true);
    try{
      const data: OpDTO[] = await fetchOps({ de, ate, filial, status: "AA,SS", incluirRoteiro: 1, limit: 300 });
      // só OPs que têm Pintura, e TODOS os outros setores (se houver) finalizados:
      const lista = await Promise.all(
        data
          .filter(op => (op.setoresSelecionados?.length ? op.setoresSelecionados : (op.roteiro||[]).map(r=>r.setor)).includes("Pintura"))
          .map(async op => {
            const setores = (op.setoresSelecionados?.length ? op.setoresSelecionados : (op.roteiro||[]).map(r=>r.setor)).filter(s=>s!=="Pintura");
            const estados = await Promise.all(setores.map(s=>getExecState(op.numero, s)));
            const todosFinalizados = estados.every(e => e?.status==="finished" || setores.length===0);
            if (!todosFinalizados) return null;
            const execP = await getExecState(op.numero, "Pintura");
            return { ...op, __exec: execP?.status ?? "queued" } as OpDTO & {__exec:string};
          })
      );
      let fil = (lista.filter(Boolean) as any[]).sort((a,b)=>(a.datas?.validade||"")<(b.datas?.validade||"")?-1:1);
      if (corFiltro) fil = fil.filter(x => (x.cor||"").toLowerCase().includes(corFiltro.toLowerCase()));
      setOps(fil);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ carregar(); }, []);
  useEffect(()=>{ if(!auto) return; const id=setInterval(carregar,15000); return ()=>clearInterval(id); }, [auto, de, ate, filial, corFiltro]);
  useEffect(()=>{ localStorage.setItem("p_pint_de", de); localStorage.setItem("p_pint_ate", ate); localStorage.setItem("operador", operador||""); }, [de,ate,operador]);

  const grupos = useMemo(()=>groupBy(ops, op => (op.cor||"SEM COR") as string), [ops]);
  const cores = Object.keys(grupos).sort();

  async function onStart(op: OpDTO){ if(!operador){ alert("Informe o operador."); return; } await startExec(op.numero, "Pintura", operador); carregar(); }
  async function onFinish(op: OpDTO){ await finishExec(op.numero, "Pintura"); setOps(curr=>curr.filter(x=>x.numero!==op.numero)); }
  async function onLogM2(op: OpDTO){
    const m2 = Number(prompt("m² pintados hoje:", "0")||"0");
    if (m2>0) await postPinturaLog(op.numero, new Date().toISOString().slice(0,10), m2, operador||undefined);
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pintura</h2>
        <label className="text-sm inline-flex items-center gap-2">
          <input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>
          Auto-atualizar (15s)
        </label>
      </header>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-2"><label className="label">De</label><input type="date" className="input" value={de} onChange={e=>setDe(e.target.value)} /></div>
        <div className="lg:col-span-2"><label className="label">Até</label><input type="date" className="input" value={ate} onChange={e=>setAte(e.target.value)} /></div>
        <div className="lg:col-span-2"><label className="label">Filial</label><input type="number" className="input" value={filial} onChange={e=>setFilial(Number(e.target.value))} /></div>
        <div className="lg:col-span-3"><label className="label">Operador</label><input className="input" value={operador} onChange={e=>setOperador(e.target.value)} /></div>
        <div className="lg:col-span-3"><label className="label">Filtro por cor</label><input className="input" placeholder="ex.: CINZA" value={corFiltro} onChange={e=>setCorFiltro(e.target.value)} /></div>
      </div>

      {cores.map(cor => (
        <section key={cor} className="bg-white rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Cor: {cor}</h3>
            <span className="text-xs text-gray-500">{grupos[cor].length} OPs</span>
          </div>
          <div className="space-y-3">
            {grupos[cor].map(op => {
              const v = badgeValidity(op.datas?.validade);
              // m² total esperado (se existir no DTO; se não, 0)
              const m2total = (op as any).m2 ?? 0;
              return (
                <article key={op.numero} className={`card p-3 ${v?.tone ?? ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">OP {op.numero}</div>
                    <div className="text-xs text-gray-500">
                      Emissão: {fmtBr(op.datas?.emissao)} • Validade: <span className="text-red-600">{fmtBr(op.datas?.validade)}</span>{v?` (${v.d}d)`:``}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">{op.descricao ?? "—"}</div>
                  <div className="mt-2"><Progress value={op.progressoCalculado||0} /></div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-gray-600">m²: <b>{m2total}</b></div>
                    <div className="flex gap-2">
                      <button className="btn" disabled={(op as any).__exec==="started"} onClick={()=>onStart(op)}>Iniciar</button>
                      <button className="btn" onClick={()=>onLogM2(op)}>Registrar m²</button>
                      <button className="btn btn-primary" onClick={()=>onFinish(op)}>Finalizar</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
