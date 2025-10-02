import { useEffect, useState } from 'react'
import { db, seedIfEmpty, ensureCategoryIcons, resetAndImport } from '../store/db.js'
import { Card, Button } from '../components/UI.jsx'
import useAuth from '../store/useAuth.js'
import CategoriesTab from './admin/CategoriesTab.jsx'
import ProductsTab from './admin/ProductsTab.jsx'
import ReceiptsTab from './admin/ReceiptsTab.jsx'

export default function Admin(){
  const { user } = useAuth()
  const [tab, setTab] = useState('products')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])

  useEffect(()=>{ (async ()=>{
    await seedIfEmpty()
    await ensureCategoryIcons()
    await reload()
  })() },[])

  async function reload(){
    const cats = await db.table('categories').orderBy('sort').toArray()
    const prods = await db.table('products').toArray()
    setCategories(cats); setProducts(prods)
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-4 pr-56">
        <Card>
          <div className="text-lg font-semibold">Pristup ograničen</div>
          <div className="opacity-80">Prijavite se kao admin da biste uređivali artikle, kategorije i račune.</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 pr-56 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button className={tab==='products'?'opacity-100':'opacity-60'} onClick={()=>setTab('products')}>Proizvodi</Button>
        <Button className={tab==='categories'?'opacity-100':'opacity-60'} onClick={()=>setTab('categories')}>Kategorije</Button>
        <Button className={tab==='receipts'?'opacity-100':'opacity-60'} onClick={()=>setTab('receipts')}>Računi</Button>
      </div>

      {tab==='categories' && <CategoriesTab categories={categories} onChange={reload}/> }
      {tab==='products'   && <ProductsTab   categories={categories} products={products} onChange={reload} />}
      {tab==='receipts'   && <ReceiptsTab/>}
    </div>
  )
}

/* ================== CSV helper (ostavljen u Admin za import) ================== */
export function parseCSV(text){
  const firstLine = (text.split(/\r?\n/)[0] || '')
  const delim = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','
  const lines = text.split(/\r?\n/).filter(l => l.trim().length>0)
  if (lines.length === 0) return []
  const parseLine = (line) => {
    const out = []; let cur = ''; let inQ = false
    for (let i=0;i<line.length;i++){
      const ch = line[i]
      if (ch === '"'){ if (inQ && line[i+1] === '"'){ cur += '"'; i++ } else { inQ = !inQ } }
      else if (ch === delim && !inQ){ out.push(cur); cur = '' }
      else { cur += ch }
    }
    out.push(cur)
    return out.map(s=>s.trim())
  }
  const header = parseLine(lines[0])
  const idxCat = header.findIndex(h => h.trim().toLowerCase() === 'kategorija')
  const idxName = header.findIndex(h => h.trim().toLowerCase() === 'naziv artikla')
  const idxPrice = header.findIndex(h => h.toLowerCase().includes('cena'))
  if (idxCat === -1 || idxName === -1 || idxPrice === -1){
    throw new Error('CSV zaglavlje nije prepoznato. Očekujem: Kategorija, Naziv artikla, Cena (RSD)')
  }
  const rows = []
  for (let i=1;i<lines.length;i++){
    const cols = parseLine(lines[i])
    if (!cols[idxName]) continue
    rows.push({ 'Kategorija': cols[idxCat] ?? '', 'Naziv artikla': cols[idxName], 'Cena (RSD)': cols[idxPrice] ?? '' })
  }
  return rows
}

/* ================== Uvozni panel (mali) za ProductsTab ================== */
export function ImportPanel({ onResetImport }){
  const [csvFile, setCsvFile] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handle(){
    if (!csvFile){ alert('Izaberite CSV fajl.'); return }
    if (!confirm('OBRISAĆE sve postojeće proizvode i kategorije i uvesti iz CSV-a. Nastaviti?')) return
    setBusy(true)
    try {
      const text = await csvFile.text()
      const rows = parseCSV(text)
      await resetAndImport(rows)
      onResetImport?.()
      alert('Uvoz gotov.')
    } catch (e) {
      alert('Greška pri uvozu: ' + e.message)
    } finally {
      setBusy(false); setCsvFile(null)
    }
  }

  return (
    <div className="mt-6">
      <div className="text-sm font-semibold">Masovni uvoz (CSV)</div>
      <input type="file" accept=".csv"
        onChange={e=>setCsvFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border file:border-neutral-300 dark:file:border-neutral-700 file:bg-white dark:file:bg-neutral-800 file:text-current mt-1"
        disabled={busy}
      />
      <div className="mt-2"><Button onClick={handle} disabled={busy || !csvFile}>{busy ? 'Uvozim…' : 'Resetuj i uvezi CSV'}</Button></div>
    </div>
  )
}
