import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import OpsListPage from "./pages/OpsList";

export default function App() {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200">
        <div className="container-page h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold">Gestão de Produção</Link>
          <a href="/manifest.webmanifest" className="text-sm text-gray-600 hover:text-gray-800">PWA</a>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<OpsListPage />} />
      </Routes>

      <footer className="container-page py-8 text-xs text-gray-500">
        Backend: <code>/integracao/ops-param</code> • PWA base • M6
      </footer>
    </div>
  );
}
