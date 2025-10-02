// src/pages/pos/SplitModal.jsx
import { useEffect, useState } from 'react'

export default function SplitModal({ open, onClose, sourceItems, products, onConfirm }){
  const [q, setQ] = useState(()=> {
    const m = new Map()
    sourceItems.forEach(it => m.set(it.id, 0))
    return m
  })

  useEffect(()=>{
    if (open){
      const m = new Map()
      sourceItems.forEach(it => m.set(it.id, 0))
      setQ(m)
    }
  }, [open, sourceItems])

  function inc(it){
    const max = it.qty
    setQ(prev=>{
      const n = new Map(prev)
      const cur = n.get(it.id) || 0
      n.set(it.id, Math.min(max, cur+1))
      return n
    })
  }
  function dec(it){
    setQ(prev=>{
      const n = new Map(prev)
      const cur = n.get(it.id) || 0
      n.set(it.id, Math.max(0, cur-1))
      return n
    })
  }

  const rows = sourceItems.map(it=>{
    const p = products.find(x=>x.id===it.productId)
    const name = p?.name ?? 'Artikal'
    const price = it.priceEach ?? p?.price ?? 0
    const sel = q.get(it.id) || 0
    return { item: it, name, price, selected: sel }
  })

  const picked = rows.filter(r => r.selected>0)
  const totalSel = picked.reduce((s,r)=> s + r.selected * r.price, 0)

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="text-lg font-semibold mb-2">Podeli račun – odaberi stavke</div>
        <div className="text-sm opacity-80 mb-3">Izaberi količine koje idu na posebni predračun. Ostalo ostaje na stolu.</div>
        <div className="max-h-[50vh] overflow-auto no-scrollbar space-y-2">
          {rows.map(r=>(
            <div key={r.item.id} className="border rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs opacity-70">{r.price.toFixed(2)} RSD · Na stolu: {r.item.qty}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>dec(r.item)} className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-800 touch-btn transition">−</button>
                <div className="w-8 text-center">{r.selected}</div>
                <button onClick={()=>inc(r.item)} className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-800 touch-btn transition">+</button>
              </div>
            </div>
          ))}
          {rows.length===0 && <div className="opacity-70">Nema stavki.</div>}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Ukupno selektovano: {totalSel.toFixed(2)} RSD</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border dark:border-neutral-800 touch-btn">Otkaži</button>
            <button
              onClick={()=>onConfirm(picked.map(p=>({ itemId:p.item.id, productId:p.item.productId, qty:p.selected, priceEach:p.price })))}
              className="px-3 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white touch-btn"
              disabled={picked.length===0}
            >
              Štampaj deo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
