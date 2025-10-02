// src/pages/pos/components/TotalsBar.jsx
export default function TotalsBar({ label, amount }){
  return (
    <div className="mt-4 border-t border-neutral-200/70 dark:border-neutral-800 pt-3 flex items-center justify-between">
      <div className="text-lg">{label}</div>
      <div className="text-2xl font-bold">{amount.toFixed(2)} RSD</div>
    </div>
  );
}
