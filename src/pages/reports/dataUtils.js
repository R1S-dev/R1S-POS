// src/pages/reports/dataUtils.js

/* ================== Local keys ================== */
export const LSK_LAST_PRESEK = 'lastPresekAtISO'
const LSK_PRINTED_SIGS = 'printedSignatures.v1'   // Set stringova
const LSK_PRESEK_HISTORY = 'presekHistory.v1'     // Array zapisa

/* ================== Helpers ================== */
export function formatDateTime(d=new Date()){ return d.toLocaleString('sr-RS') }

export function getLastPresekAt(){
  const s = localStorage.getItem(LSK_LAST_PRESEK)
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}
export function setLastPresekAt(iso){ localStorage.setItem(LSK_LAST_PRESEK, iso) }

export function loadPrintedSigs(){
  try {
    const raw = localStorage.getItem(LSK_PRINTED_SIGS)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch { return new Set() }
}
function savePrintedSigs(set){
  try { localStorage.setItem(LSK_PRINTED_SIGS, JSON.stringify(Array.from(set))) } catch {}
}
export function addPrintedSigs(sigs){
  const set = loadPrintedSigs()
  for (const s of sigs) set.add(s)
  savePrintedSigs(set)
}

export function loadHistory(){
  try {
    const raw = localStorage.getItem(LSK_PRESEK_HISTORY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
export function saveHistory(list){
  try { localStorage.setItem(LSK_PRESEK_HISTORY, JSON.stringify(list)) } catch {}
}
export function pushHistoryEntry(entry){
  const list = loadHistory()
  list.push(entry)
  saveHistory(list)
}

/* --------- Signature reda (stabilno filtriranje i bez timestamp-a) --------- */
export function rowSignature(r){
  const src = r._src || 'auto'
  const ts = r._ts || r.createdAt || ''
  const pid = r.productId ?? ''
  const nm = r.name ?? r.productName ?? ''
  const tid = r.tableId ?? ''
  const oid = r.orderId ?? ''
  const qty = Number(r.qty) || 0
  const prc = Number(r.priceEach) || 0
  return `${src}|o:${oid}|t:${tid}|p:${pid}|n:${nm}|q:${qty}|pe:${prc}|ts:${ts}`
}

/* Grupisanje artikala za prikaz/štampu */
export function groupItems(rows){
  const m = new Map()
  for (const r of rows){
    const name = r.name || r.productName || `Artikal${r.productId ? ' #' + r.productId : ''}`
    const qty  = Number(r.qty) || 0
    const price= Number(r.priceEach) || 0
    const prev = m.get(name) || { name, qty: 0, amt: 0 }
    prev.qty += qty
    prev.amt += qty * price
    m.set(name, prev)
  }
  return Array.from(m.values()).sort((a,b)=> b.amt - a.amt || b.qty - a.qty)
}
