import { useMemo, useState } from 'react'
import { db } from '../../store/db.js'
import { Card, Button } from '../../components/UI.jsx'
import { ImportPanel } from '../Admin.jsx'

export default function ProductsTab({ categories, products, onChange }){
  const [name, setName] = useState(''); const [price, setPrice] = useState('')
  const [catId, setCatId] = useState(categories[0]?.id || null)
  const [q, setQ] = useState('')

  async function addProd(){
    if (!name.trim() || !catId) return
    await db.table('products').add({ name: name.trim(), price: Number(price)||0, categoryId: catId })
    setName(''); setPrice(''); onChange()
  }
  async function updateProd(p){ await db.table('products').update(p.id, { name:p.name, price:Number(p.price)||0, categoryId:Number(p.categoryId)||null }); onChange() }
  async function delProd(id){ if (confirm('Obrisati proizvod?')){ await db.table('products').delete(id); onChange() } }

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    if (!qq) return products
    return products.filter(p => p.name.toLowerCase().includes(qq))
  },[products, q])

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <div className="text-lg font-semibold mb-3">Dodaj proizvod</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Naziv artikla" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900 sm:col-span-2"/>
          <input value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="Cena (RSD)" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900"/>
          <select value={catId ?? ''} onChange={e=>setCatId(Number(e.target.value)||null)} className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900">
            <option value="">Kategorija…</option>
            {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mt-3"><Button onClick={addProd}>Sačuvaj</Button></div>
        <ImportPanel onResetImport={onChange}/>
      </Card>

      <Card>
        <div className="text-lg font-semibold mb-3">Svi proizvodi</div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pretraga…" className="mb-2 w-full px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900"/>
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {filtered.map(p=>(
            <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border rounded-xl px-3 py-2 dark:border-neutral-800">
              <input defaultValue={p.name} onBlur={e=>updateProd({ ...p, name: e.target.value })} className="px-2 py-1 rounded-lg border bg-white dark:bg-neutral-900"/>
              <input type="number" defaultValue={p.price} onBlur={e=>updateProd({ ...p, price: Number(e.target.value)||0 })} className="w-28 px-2 py-1 rounded-lg border bg-white dark:bg-neutral-900 text-right"/>
              <select defaultValue={p.categoryId ?? ''} onChange={e=>updateProd({ ...p, categoryId: Number(e.target.value)||null })} className="px-2 py-1 rounded-lg border bg-white dark:bg-neutral-900">
                <option value="">—</option>
                {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={()=>delProd(p.id)} className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700">Obriši</button>
            </div>
          ))}
          {filtered.length===0 && <div className="opacity-70">Nema proizvoda.</div>}
        </div>
      </Card>
    </div>
  )
}
