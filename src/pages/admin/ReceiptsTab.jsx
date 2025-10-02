import { useEffect, useMemo, useState } from 'react'
import { db } from '../../store/db.js'
import { Card, Button, Badge } from '../../components/UI.jsx'

export default function ReceiptsTab(){
  const [rows, setRows] = useState([])
  const [tables, setTables] = useState([])
  const [q, setQ] = useState(''); const [min, setMin] = useState(''); const [max, setMax] = useState('')
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [tableId, setTableId] = useState('')
  const [showVoided, setShowVoided] = useState(true)
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20)

  useEffect(()=>{ (async ()=>{
    setTables(await db.table('posTables').toArray()); await run()
  })() },[])
  useEffect(()=>{ setPage(1) }, [from,to,tableId,q,min,max,showVoided,pageSize])

  function hasTable(name){ try{ return !!db.tables.find(t=>t.name===name) }catch{ return false } }
  function dayToDate(s){ if(!s) return new Date(0); const [y,m,d] = s.split('-').map(n=>parseInt(n,10)); return new Date(y,(m||1)-1,d||1) }
  function inDayRange(day, a, b){ if (!a && !b) return true; const d=dayToDate(day); if(a&&d<dayToDate(a))return false; if(b&&d>dayToDate(b))return false; return true }
  function saleKey(s){ return s?.receiptId ?? s?.orderId ?? s?.batchId ?? `${s?.day || '0000-00-00'}~${(s?.tableId ?? 'quick')}` }

  async function run(){
    const hasAO = hasTable('archivedOrders'), hasAI = hasTable('archivedItems')
    if (!hasAO){ return runSales() }
    let archived = await db.table('archivedOrders').toArray()
    archived.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''))
    if (archived.length===0){ return runSales() }

    if (from){ const f = new Date(from).toISOString(); archived = archived.filter(o => (o.createdAt||'') >= f) }
    if (to){ const t = new Date(to); t.setDate(t.getDate()+1); const iso=t.toISOString(); archived = archived.filter(o => (o.createdAt||'') < iso) }
    if (tableId){ const tid = Number(tableId); archived = archived.filter(o => (o.tableId ?? 0) === tid) }
    if (!showVoided){ archived = archived.filter(o => !o.voided) }

    const out=[]
    for (const o of archived){
      const its = hasAI ? await db.table('archivedItems').where('orderId').equals(o.id).toArray() : []
      const total = its.reduce((s,i)=> s + i.qty * (i.priceEach||0), 0)
      out.push({ ...o, items: its, total, text: its.map(i=>`${i.name??''} x${i.qty}`).join(', '), date: new Date(o.createdAt||Date.now()) })
    }

    const qq = q.trim().toLowerCase()
    let f = out
    if (qq) f = f.filter(r => (r.text||'').toLowerCase().includes(qq))
    const minN = min?Number(min):null, maxN = max?Number(max):null
    if (minN!=null) f=f.filter(r=>r.total>=minN); if (maxN!=null) f=f.filter(r=>r.total<=maxN)
    f.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''))
    setRows(f)
  }

  async function runSales(){
    if (!hasTable('sales')) return setRows([])
    const sales = await db.table('sales').toArray()
    const groups = new Map()
    for (const s of sales){
      const key = saleKey(s)
      const day = s?.day || (s?.createdAt ? s.createdAt.substring(0,10) : '0000-00-00')
      const g = groups.get(key) || { id:key, _day:day, createdAt:s?.createdAt || `${day}T12:00:00.000Z`, tableId:s?.tableId ?? null, items:[] }
      g.items.push({ name:s?.name||s?.productName||'Artikal', qty:s?.qty||0, priceEach:s?.priceEach||0 })
      groups.set(key,g)
    }
    let out = Array.from(groups.values()).map(g=>{
      const total = g.items.reduce((sum,i)=> sum + i.qty*(i.priceEach||0), 0)
      return { ...g, total, text:g.items.map(i=>`${i.name} x${i.qty}`).join(', '), date:new Date(g.createdAt) }
    })
    if (from||to){ out = out.filter(o => inDayRange(o._day, from, to)) }
    if (tableId){ const tid=Number(tableId); out=out.filter(o=>(o.tableId??0)===tid) }
    const qq=q.trim().toLowerCase(); if (qq) out=out.filter(r=>(r.text||'').toLowerCase().includes(qq))
    const minN=min?Number(min):null, maxN=max?Number(max):null
    if (minN!=null) out=out.filter(r=>r.total>=minN); if (maxN!=null) out=out.filter(r=>r.total<=maxN)
    out.sort((a,b)=> (b._day||'').localeCompare(a._day||'') || (b.createdAt||'').localeCompare(a.createdAt||''))
    setRows(out)
  }

  async function removeReceipt(id){
    if (!confirm('Obrisati ovaj račun?')) return
    if (db.tables.find(t=>t.name==='archivedOrders')){
      if (db.tables.find(t=>t.name==='archivedItems')) await db.table('archivedItems').where('orderId').equals(id).delete()
      await db.table('archivedOrders').delete(id)
    } else if (db.tables.find(t=>t.name==='sales')){
      const all = await db.table('sales').toArray()
      const toDel = all.filter(s => (s.receiptId ?? s.orderId ?? s.batchId ?? '') === id).map(s=>s.id).filter(Boolean)
      if (toDel.length) await db.table('sales').bulkDelete(toDel)
    }
    await run()
  }

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const pageRows = rows.slice((pageSafe-1)*pageSize, (pageSafe-1)*pageSize + pageSize)

  return (
    <Card>
      <div className="text-lg font-semibold mb-3">Računi</div>
      <div className="grid md:grid-cols-7 gap-2">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900" />
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900" />
        <select value={tableId} onChange={e=>setTableId(e.target.value)} className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900">
          <option value="">Sto (svi)</option>
          {tables.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tekst stavki…" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900" />
        <input type="number" value={min} onChange={e=>setMin(e.target.value)} placeholder="Min RSD" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900" />
        <input type="number" value={max} onChange={e=>setMax(e.target.value)} placeholder="Max RSD" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900" />
        <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900">
          <input type="checkbox" checked={showVoided} onChange={e=>setShowVoided(e.target.checked)} />
          <span>Prikaži stornirane</span>
        </label>
      </div>

      <div className="mt-2"><Button onClick={run}>Pretraži</Button></div>

      <div className="mt-4 space-y-2 max-h-[60vh] overflow-auto pr-1">
        {pageRows.map(r=>{
          const dateStr = r.date?.toLocaleString?.() || new Date(r.createdAt).toLocaleString()
          const tableName = r.tableId ? (tables.find(t=>t.id===r.tableId)?.name ?? `Sto ${r.tableId}`) : 'Brzo kucanje'
          return (
            <div key={r.id} className="rounded-xl border p-3 dark:border-neutral-800">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <span>{tableName}</span>{r.voided && <Badge>STORNIRANO</Badge>}
                </div>
                <div className="text-sm opacity-80">{dateStr}</div>
              </div>
              <div className="mt-1 text-sm opacity-90">{r.text || '—'}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-lg font-bold">{r.total.toFixed(2)} RSD</div>
                <Button onClick={()=>removeReceipt(r.id)} className="bg-red-600 hover:bg-red-700">Obriši</Button>
              </div>
            </div>
          )
        })}
        {pageRows.length===0 && <div className="opacity-70">Nema rezultata za dati filter.</div>}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div>Ukupno: <b>{totalRows}</b>, Strana <b>{pageSafe}</b>/<b>{totalPages}</b></div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={pageSafe<=1} className="px-3 py-1.5 rounded-lg border bg-white dark:bg-neutral-900">‹ Prethodna</button>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={pageSafe>=totalPages} className="px-3 py-1.5 rounded-lg border bg-white dark:bg-neutral-900">Sledeća ›</button>
        </div>
      </div>
    </Card>
  )
}
