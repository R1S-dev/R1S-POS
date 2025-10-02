// src/pages/pos/hooks/usePrinting.js
import { useState } from 'react';
import { db, archiveOrder } from '../../../store/db.js';
import { buildReceiptHTML, formatDateTime, makePrebillNo, openPrint } from '../print.js';

// NOVO: WebUSB ESC/POS tihi print
import { usbIsAvailable, ensureConnected, printReceiptEscpos } from '../../../printing/escpos-usb.js';

// Pokušaj "tihog" USB printa; ako ne može, vrati false (fallback ide na window.print)
async function tryUsbSilentPrint({ shop, meta, items, total }) {
  // Podrazumevano uključi (možeš da isključiš: localStorage.setItem('usbPrint','0'))
  const pref = localStorage.getItem('usbPrint');
  if (pref === null) localStorage.setItem('usbPrint', '1');
  if (localStorage.getItem('usbPrint') !== '1') return false;

  if (!(await usbIsAvailable())) return false; // npr. Firefox

  try {
    // Ovo se poziva iz click handler-a (user gesture) — dozvola će se pojaviti prvi put
    await ensureConnected();
    await printReceiptEscpos({ shop, meta, items, total, warning: 'OVO NIJE FISKALNI RAČUN' });
    return true;
  } catch (e) {
    console.warn('USB silent print failed:', e);
    return false;
  }
}

// Dodatni helper da korisnik ručno "upari" štampač iz UI (dugme Poveži štampač)
export async function connectUsbPrinter() {
  try {
    localStorage.setItem('usbPrint', '1');
    await ensureConnected();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Greška pri povezivanju USB štampača' };
  }
}

export default function usePrinting({
  quickMode,
  tableId,
  orderId,
  items, setItems,
  products,
  activeGuest,
  nav
}){
  const [splitOpen, setSplitOpen] = useState(false);

  async function payGuest(g){
    const list = quickMode
      ? items.filter(i => (i.guestId||1) === g)
      : await db.table('orderItems').where('orderId').equals(orderId).toArray().then(arr => arr.filter(i => (i.guestId||1)===g));

    if (list.length === 0) return;

    const mapped = list.map(it=>{
      const p = products.find(x=>x.id===it.productId);
      return { name: p?.name ?? 'Artikal', qty: it.qty, priceEach: it.priceEach ?? p?.price ?? 0 };
    });
    const totalNow = mapped.reduce((s,i)=> s + i.qty*i.priceEach, 0);

    // arhiviraj selekciju kao zaseban order i ukloni je iz aktivnog
    const tempOrderId = await db.table('orders').add({ tableId: quickMode? null : tableId, status: 'open', createdAt: new Date().toISOString() });
    for (const it of list){
      await db.table('orderItems').add({ orderId: tempOrderId, productId: it.productId, qty: it.qty, priceEach: it.priceEach, guestId: (it.guestId||1) });
    }
    await archiveOrder(tempOrderId);

    if (quickMode){
      setItems(prev => prev.filter(i => (i.guestId||1)!==g));
    } else {
      for (const it of list){
        await db.table('orderItems').delete(it.id);
      }
      const it = await db.table('orderItems').where('orderId').equals(orderId).toArray();
      setItems(it);
    }

    const label = quickMode ? `G${g}` : `Sto #${tableId} — G${g}`;
    const shop = { name: 'Caffe Club M', place: 'Drinska 2, 15310 Ribari', logo: '/racun_logo.png' };
    const now = new Date();
    const meta = { title: `PREDRAČUN (G${g})`, datetime: formatDateTime(now), number: makePrebillNo(now, `G${g}`), refLeft: label };

    // Pokušaj tihi USB print; fallback na window.print
    const silentOK = await tryUsbSilentPrint({ shop, meta, items: mapped, total: totalNow });
    if (!silentOK) {
      const html = buildReceiptHTML({ shop, meta, items: mapped, total: totalNow, warning: 'OVO NIJE FISKALNI RAČUN', qrUrl: 'https://www.instagram.com/caffe_club_m/#' });
      openPrint(html);
    }

    nav('/');
  }

  async function printAndArchiveAll(){
    let list = items;
    let label = quickMode ? 'Brzo kucanje' : `Sto #${tableId}`;

    if (!quickMode){
      list = await db.table('orderItems').where('orderId').equals(orderId).toArray();
    }
    if (list.length === 0) return;

    const mapped = list.map(it=>{
      const p = products.find(x=>x.id===it.productId);
      return { name: p?.name ?? 'Artikal', qty: it.qty, priceEach: it.priceEach ?? p?.price ?? 0 };
    });
    const totalNow = mapped.reduce((s,i)=> s + i.qty*i.priceEach, 0);

    if (quickMode){
      const id = await db.table('orders').add({ tableId: null, status: 'open', createdAt: new Date().toISOString() });
      for (const it of list){
        await db.table('orderItems').add({ orderId: id, productId: it.productId, qty: it.qty, priceEach: it.priceEach, guestId: (it.guestId||1) });
      }
      await archiveOrder(id);
      setItems([]);
    } else {
      await archiveOrder(orderId);
    }

    const shop = { name: 'Caffe Club M', place: 'Drinska 2, 15310 Ribari', logo: '/racun_logo.png' };
    const meta = { title: 'PREDRAČUN', datetime: formatDateTime(new Date()), number: makePrebillNo(new Date()), refLeft: label };

    const silentOK = await tryUsbSilentPrint({ shop, meta, items: mapped, total: totalNow });
    if (!silentOK) {
      const html = buildReceiptHTML({
        shop, meta, items: mapped, total: totalNow,
        warning: 'OVO NIJE FISKALNI RAČUN',
        qrUrl: 'https://www.instagram.com/caffe_club_m/#'
      });
      openPrint(html);
    }

    nav('/');
  }

  async function printActive(){
    if (activeGuest === 0) {
      return printAndArchiveAll();
    }
    return payGuest(activeGuest);
  }

  return {
    splitOpen, setSplitOpen,
    printActive,
  };
}
