import React from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import OpsListPage from "./pages/OpsList";
import Paineis from "./pages/Paineis";

export default function App() {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200">
        <div className="container-page h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold">Gestão de Produção</Link>

          <div className="flex items-center gap-3 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-2 py-1 rounded ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100"}`
              }
            >
              OPs
            </NavLink>

            <NavLink
              to="/paineis"
              className={({ isActive }) =>
                `px-2 py-1 rounded ${isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100"}`
              }
            >
              Painéis (M7)
            </NavLink>

            <a href="/manifest.webmanifest" className="text-gray-600 hover:text-gray-800">PWA</a>
          </div>
        </div>
      </nav>

      <main className="container-page py-6">
        <Routes>
          <Route path="/" element={<OpsListPage />} />
          <Route path="/paineis" element={<Paineis />} />
        </Routes>
      </main>

      <footer className="container-page py-8 text-xs text-gray-500">
        Backend: <code>/integracao/ops-param</code> • PWA base • M6
      </footer>
    </div>
  );
}
