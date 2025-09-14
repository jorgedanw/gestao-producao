import React from "react";

export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500"
        style={{ width: `${v}%`, transition: "width .3s" }}
        aria-valuenow={v}
        role="progressbar"
      />
    </div>
  );
}
