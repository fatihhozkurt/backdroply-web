import { CircleHelp } from "lucide-react";

export default function Tooltip({ text }) {
  return (
    <span className="group relative inline-flex cursor-help items-center">
      <CircleHelp size={14} className="text-slate-400" />
      <span className="pointer-events-none absolute left-5 top-5 z-20 hidden w-56 rounded-lg border border-slate-700 bg-slate-900/95 px-2 py-1.5 text-xs text-slate-200 shadow-2xl group-hover:block">
        {text}
      </span>
    </span>
  );
}
