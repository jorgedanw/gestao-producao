import React from "react";

export function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    ABERTA: "bg-blue-100 text-blue-700",
    ENTRADA_PARCIAL: "bg-amber-100 text-amber-700",
    FINALIZADA: "bg-green-100 text-green-700",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return <span className={`badge ${cls}`}>{status}</span>;
}
