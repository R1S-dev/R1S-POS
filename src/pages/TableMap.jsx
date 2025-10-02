import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db, seedIfEmpty, setTablePct, addTable, deleteTableSafe } from '../store/db.js'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../store/useAuth.js'
import { Coffee, Lock, Unlock, Plus, Trash2 } from 'lucide-react'

const TABLE_SIZE = 46
const pctFromLegacy = (t)=>{
  if (typeof t.xpct==='number' && typeof t.ypct==='number') return { xpct:t.xpct, ypct:t.ypct }
  if (typeof t.x==='number' && typeof t.y==='number'){
    return { xpct: Math.min(1, Math.max(0, (t.x+0.5)/24)), ypct: Math.min(1, Math.max(0, (t.y+0.5)/14)) }
  }
  return { xpct:0.1, ypct:0.1 }
}

export default function TableMap(){
  const [tables, setTables] = useState([]); const [ordersOpen, setOrdersOpen] = useState([])
  const [items, setItems] = useState([]); const [edit, setEdit] = useState(false)
  const stageRef = useRef(null); const { user } = useAuth(); const nav = useNavigate()

  const reload = useCallback(async ()=>{
    await seedIfEmpty()
    const [t, oo, it] = await Promise.all([
      db.table('posTables').toArray(),
      db.table('orders').where('status').equals('open').toArray(),
      db.table('orderItems').toArray(),
    ])
    setTables(t); setOrdersOpen(oo); setItems(it)
  },[])
  useEffect(()=>{ reload(); const f=()=>reload(); const v=()=>{ if (document.visibilityState==='visible') reload() }
    window.addEventListener('focus',f); document.addEventListener('visibilitychange',v)
    return ()=>{ window.removeEventListener('focus',f); document.removeEventListener('visibilitychange',v) }
  },[reload])

  const occupied = useMemo(()=>{
    const qtyByOrder = items.reduce((m,i)=> (m[i.orderId]=(m[i.orderId]||0)+i.qty, m), {})
    const busy = new Set(); for (const o of ordersOpen){ if ((qtyByOrder[o.id]||0) > 0) busy.add(o.tableId) }
    return busy
  }, [ordersOpen, items])

  function toPct(e){
    const host = stageRef.current; if (!host) return { xpct:0, ypct:0 }
    const rect = host.getBoundingClientRect()
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left - TABLE_SIZE/2
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top  - TABLE_SIZE/2
    const xpct = Math.min(1, Math.max(0, x / Math.max(1, rect.width  - TABLE_SIZE)))
    const ypct = Math.min(1, Math.max(0, y / Math.max(1, rect.height - TABLE_SIZE)))
    return { xpct:+xpct.toFixed(4), ypct:+ypct.toFixed(4) }
  }

  function startDrag(e, t){
    if (!edit) return
    e.preventDefault()
    const move = (ev)=>{ const { xpct, ypct } = toPct(ev); setTablePct(t.id, xpct, ypct).then(reload) }
    const up = ()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); window.removeEventListener('touchmove',move); window.removeEventListener('touchend',up) }
    window.addEventListener('pointermove',move,{passive:true}); window.addEventListener('pointerup',up,{passive:true})
    window.addEventListener('touchmove',move,{passive:true}); window.addEventListener('touchend',up,{passive:true})
  }

  async function onAdd(){
    const id = await addTable('Sto'); await reload()
    // mala pomoć: fokus na pomeranje odmah
    const t = tables.find(x=>x.id===id); if (!t) return
  }
  async function onDelete(t){
    try { await deleteTableSafe(t.id); await reload() }
    catch(e){ alert(e.message || 'Sto je zauzet i ne može se obrisati.') }
  }

  return (
    <div className="fullscreen-map">
      <div className="tables-area"><img className="tables-img" src="/tables-bg.gif" alt="Mapa lokala" /><div className="tables-area-overlay" /></div>
      <div ref={stageRef} className="tables-stage">
        <div className="relative w-full h-full">
          {tables.map(t=>{
            const { xpct, ypct } = pctFromLegacy(t)
            const isBusy = occupied.has(t.id)
            const base = `absolute inline-flex items-center justify-center touch-btn transition rounded-[3px] shadow-sm border text-[11px] font-semibold select-none backdrop-blur-[2px]`
            const status = isBusy ? 'bg-red-600/85 border-red-700 text-white hover:bg-red-600' : 'bg-green-600/85 border-green-700 text-white hover:bg-green-600'
            const style = { left:`calc(${(xpct*100).toFixed(3)}% - ${TABLE_SIZE/2}px)`, top:`calc(${(ypct*100).toFixed(3)}% - ${TABLE_SIZE/2}px)`, width:TABLE_SIZE, height:TABLE_SIZE }
            return (
              <div key={t.id} className={`${base} ${status}`} style={style}
                   onPointerDown={(e)=>startDrag(e,t)} onTouchStart={(e)=>startDrag(e,t)}>
                <Coffee size={14} className="opacity-85 mr-1"/>{t.name}
                {edit && (
                  <button onClick={()=>onDelete(t)} className="absolute -top-2 -right-2 bg-black/70 rounded-full p-1 border border-white/20">
                    <Trash2 size={14} className="text-white"/>
                  </button>
                )}
                {!edit && (
                  <button onClick={()=>nav(`/pos?table=${t.id}`)} className="absolute inset-0" title={t.name} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {user && (
        <div className="no-print fixed left-4 bottom-4 z-10 flex items-center gap-2">
          <button onClick={()=>setEdit(e=>!e)} className="px-3 py-2 rounded-xl bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800">
            {edit ? <span className="inline-flex items-center gap-2"><Unlock size={16}/> Otključano</span> : <span className="inline-flex items-center gap-2"><Lock size={16}/> Zaključano</span>}
          </button>
          {edit && (
            <button onClick={onAdd} className="px-3 py-2 rounded-xl bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800 inline-flex items-center gap-2">
              <Plus size={16}/> Dodaj sto
            </button>
          )}
        </div>
      )}
    </div>
  )
}
