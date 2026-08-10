"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function ResolveSyncButton({ id, resolved }: { id: string; resolved: boolean }) {
  const [done, setDone] = useState(resolved);
  async function resolve() {
    const response = await fetch(`/api/sync-failures/${id}/resolve`, { method: "POST" });
    if (response.ok) setDone(true);
  }
  if (done) return <span className="resolved-label"><Check size={14} /> 已处理</span>;
  return <button className="secondary-button small-button" onClick={resolve} type="button">标记已处理</button>;
}
