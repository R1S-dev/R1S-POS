// src/pages/pos/components/ProductGrid.jsx
export default function ProductGrid({ products, onAdd, hint }){
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
      {products.map(p=>(
        <button
          key={p.id}
          onClick={()=>onAdd(p)}
          className="text-left rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-4 hover:border-brand active:scale-[0.99] transition touch-btn bg-[var(--surface)]"
        >
          <div className="font-semibold text-[15px]">{p.name}</div>
          <div className="text-sm opacity-70 mt-1">{p.price.toFixed(2)} RSD</div>
          <div className="mt-1 text-[11px] opacity-70">{hint}</div>
        </button>
      ))}
      {products.length===0 && <div className="opacity-60">Nema artikala u ovoj kategoriji.</div>}
    </div>
  );
}
