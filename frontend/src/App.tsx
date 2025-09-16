import React from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import OpsListPage from "./pages/OpsList";
import Paineis from "./pages/Paineis";
import SetorPainel from "./pages/SetorPainel";
import Expedicao from "./pages/setores/Expedicao";

export default function App() {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      {/* Topbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container-page h-14 flex items-center justify-between">
          {/* Logo / título */}
          <Link to="/" className="font-semibold tracking-tight hover:text-gray-800">
            Gestão de Produção
          </Link>

          {/* Navegação à direita */}
          <div className="flex items-center gap-3">
            {/* Segmented control: OPs | Painéis */}
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  [
                    "px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-blue-200 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  ].join(" ")
                }
              >
                OPs
              </NavLink>

              <NavLink
                to="/paineis"
                className={({ isActive }) =>
                  [
                    "px-3 py-1.5 text-sm transition-colors border-l border-gray-200",
                    isActive
                      ? "bg-blue-200 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  ].join(" ")
                }
              >
                Painéis
              </NavLink>
            </div>

            {/* “Chip” PWA (somente link simples, sem parecer selecionável) */}
            <a
              href="/manifest.webmanifest"
              className="px-2.5 py-1 text-sm rounded-md border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400"
              title="Ver manifest do PWA"
            >
              PWA
            </a>
          </div>
        </div>
      </nav>

      {/* Conteúdo */}
      <main className="container-page py-6">
        <Routes>
          <Route path="/" element={<OpsListPage />} />
          <Route path="/paineis" element={<Paineis />} />
          <Route path="/paineis/perfiladeira" element={<SetorPainel setor="Perfiladeira" />} />
          <Route path="/paineis/serralheria" element={<SetorPainel setor="Serralheria" />} />
          <Route path="/paineis/eixo" element={<SetorPainel setor="Eixo" />} />
          <Route path="/paineis/pintura" element={<SetorPainel setor="Pintura" modo="pintura" />} />
          <Route path="/paineis/expedicao" element={<Expedicao />} />
        </Routes>
      </main>

      {/* Rodapé */}
      <footer className="container-page py-8 text-xs text-gray-500">
        Backend: <code>/integracao/ops-param</code> • PWA base • M6
      </footer>
    </div>
  );
}
