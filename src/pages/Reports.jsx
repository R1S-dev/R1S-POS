// src/pages/Reports.jsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../store/db.js'
import { Card, Button } from '../components/UI.jsx'
import { format } from 'date-fns'

import { buildPrintCSS, openPrint } from './reports/print.js'
import {
  LSK_LAST_PRESEK, formatDateTime, getLastPresekAt, setLastPresekAt,
  loadPrintedSigs, addPrintedSigs,
  pushHistoryEntry, rowSignature, groupItems
} from './reports/dataUtils.js'

export default function Reports(){
  const [shiftRows, setShiftRows] = useState([])
  const [since, setSince] = useState(getLastPresekAt())
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ reload() },[])

  async function reload(){
    setLoading(true)

    // 1) Pokušaj arhive (archivedOrders + archivedItems)
    let reconstructed = []
    try {
      const [archivedOrders, archivedItems] = await Promise.all([
        db.table('archivedOrders').toArray().catch(()=>[]),
        db.table('archivedItems').toArray().catch(async ()=> {
          try { return await db.table('archivedOrderItems').toArray() } catch { return [] }
        })
      ])

      if (archivedOrders.length && archivedItems.length){
        const itemsByOrder = new Map()
        for (const it of archivedItems){
          const arr = itemsByOrder.get(it.orderId) || []
          arr.push(it)
          itemsByOrder.set(it.orderId, arr)
        }
        for (const o of archivedOrders){
          const orderTs =
              o.archivedAt || o.closedAt || o.printedAt ||
              o.completedAt || o.updatedAt || o.createdAt ||
              o.time || null
          const its = itemsByOrder.get(o.id) || []
          for (const it of its){
            reconstructed.push({
              _src: 'arch',
              orderId: o.id,
              tableId: o.tableId ?? null,
              name: it.name ?? null,
              productId: it.productId ?? null,
              qty: Number(it.qty) || 0,
              priceEach: Number(it.priceEach) || 0,
              _ts: orderTs
            })
          }
        }
      }
    } catch {}

    // 2) Fallback: sales
    if (!reconstructed.length){
      try {
        const s = await db.table('sales').toArray()
        reconstructed = s.map(row => {
          const ts = row._ts || row.archivedAt || row.closedAt || row.printedAt ||
                     row.timestamp || row.time || row.createdAt || null
          return {
            _src: 'sales',
            orderId: row.orderId ?? null,
            tableId: row.tableId ?? null,
            name: row.name ?? row.productName ?? null,
            productId: row.productId ?? null,
            qty: Number(row.qty) || 0,
            priceEach: Number(row.priceEach) || 0,
            _ts: ts
          }
        })
      } catch {}
    }

    // 3) Filtriranje: isključi sve prethodno odštampane potpise
    const printed = loadPrintedSigs()
    const sinceTs = since?.getTime?.() || null
    const filtered = []
    for (const r of reconstructed){
      const sig = rowSignature(r)
      if (printed.has(sig)) continue
      if (sinceTs){
        const t = r._ts ? new Date(r._ts).getTime() : NaN
        if (!isNaN(t) && t < sinceTs) continue
      }
      filtered.push({ ...r, _sig: sig })
    }

    setShiftRows(filtered)
    setLoading(false)
  }

  const itemsGrouped = useMemo(()=>groupItems(shiftRows), [shiftRows])
  const total = useMemo(()=> shiftRows.reduce((s,i)=> s + (Number(i.qty)||0) * (Number(i.priceEach)||0), 0), [shiftRows])
  const count = useMemo(()=> shiftRows.reduce((s,i)=> s + (Number(i.qty)||0), 0), [shiftRows])

  function printPresek(){
    if (!shiftRows.length) return
    const now = new Date()
    const css = buildPrintCSS()

    const rowsHTML = itemsGrouped.map(it => {
      const avg = it.qty ? (it.amt / it.qty) : 0
      return `
        <div class="row mono">
          <div class="name">${it.name}</div>
          <div class="unit">${it.qty}× ${avg.toFixed(2)}</div>
          <div class="amt">${it.amt.toFixed(2)} RSD</div>
        </div>
      `
    }).join('')

    const sinceLbl = since ? format(since, 'yyyy-MM-dd HH:mm') : 'početak'
    const nowLbl   = format(now, 'yyyy-MM-dd HH:mm')

    const html = `
      <!doctype html><html><head><meta charset="utf-8">${css}</head>
      <body><div class="receipt">
        <div class="center bold">PRESEK SMENE</div>
        <div class="center small">Od: ${sinceLbl} &nbsp;–&nbsp; Do: ${nowLbl}</div>
        <div class="hr"></div>
        <div class="row mono"><div>Ukupan promet</div><div class="bold">${total.toFixed(2)} RSD</div></div>
        <div class="row mono"><div>Ukupno artikala</div><div class="bold">${count}</div></div>
        <div class="hr"></div>
        <div class="center small bold">ARTIKLI</div>
        <div class="row small mono" style="opacity:.9"><div class="name">Artikal</div><div class="unit">Kol × Cena</div><div class="amt">Ukupno</div></div>
        ${rowsHTML || '<div class="small" style="opacity:.8">Nema podataka o artiklima.</div>'}
        <div class="hr"></div>
        <div class="center small mono">Štampano: ${formatDateTime(now)}</div>
      </div>
      <script>window.onload=()=>{ setTimeout(()=>{ window.print(); window.close(); }, 80) };</script>
      </body></html>
    `
    // 1) Štampaj
    openPrint(html)

    // 2) Obeleži SVE trenutne redove kao odštampane (potpisi)
    const sigs = shiftRows.map(r => r._sig || rowSignature(r))
    addPrintedSigs(sigs)

    // 3) Upamti istoriju preseka (za kasniji uvid)
    ;(function pushHist(){
      const entry = {
        atISO: now.toISOString(),
        sinceISO: since ? since.toISOString() : null,
        total,
        count,
        items: itemsGrouped
      }
      try { pushHistoryEntry(entry) } catch {}
    })()

    // 4) Pomeri anchor i očisti prikaz
    setLastPresekAt(now.toISOString())
    setSince(now)
    setShiftRows([])
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <div className="text-lg font-semibold mb-2">Presek (tekuća smena)</div>

        <div className="text-sm opacity-80 mb-2">
          {since
            ? <>Smena od <b>{format(since, 'yyyy-MM-dd HH:mm')}</b> do <b>{format(new Date(), 'yyyy-MM-dd HH:mm')}</b></>
            : <>Smena od <b>početka</b> do <b>{format(new Date(), 'yyyy-MM-dd HH:mm')}</b></>
          }
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xl font-bold">{total.toFixed(2)} RSD</div>
          <div className="opacity-80">{count} artikala</div>
          <div className="flex gap-2">
            <Button onClick={printPresek} disabled={loading || shiftRows.length===0}>
              Štampaj presek (resetuj)
            </Button>
            <Button onClick={reload} className="bg-neutral-700 hover:bg-neutral-600">Osveži</Button>
          </div>
        </div>

        <div className="mt-4 max-h-[55vh] overflow-auto pr-1 space-y-1">
          {loading && <div className="opacity-70">Učitavam…</div>}
          {!loading && !shiftRows.length && (
            <div className="opacity-70">Nema podataka u tekućoj smeni.</div>
          )}
          {!loading && shiftRows.length>0 && itemsGrouped.map(it=>(
            <div key={it.name} className="flex items-center justify-between border-b py-1">
              <div className="font-medium">{it.name}</div>
              <div className="text-sm opacity-80">{it.qty}×</div>
              <div className="text-sm font-semibold">{it.amt.toFixed(2)} RSD</div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs opacity-70">
          Štampanjem preseka svi redovi iz te smene se trajno označavaju kao odštampani
          (ne pojavljuju se ponovo ni posle refreša / sledećeg dana). Istorija preseka se čuva lokalno.
        </div>
      </Card>
    </div>
  )
}
