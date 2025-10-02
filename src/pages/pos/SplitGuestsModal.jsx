// src/pages/pos/SplitGuestsModal.jsx
// "Podeli" – prebacivanje stavki sa gosta na gosta (bez štampe).
// Minimalna, fokusirana verzija: izbor gostiju, lista artikala i footer.

import { useEffect, useMemo, useState } from 'react';
import { db } from '../../store/db.js';
import { MAX_GUESTS } from './constants.js';
import { User, Users, ArrowRight, Minus, Plus, Package, Coins } from 'lucide-react';

export default function SplitGuestsModal({
  open, onClose, orderId, quickMode, items, setItems, products, defaultFrom = 1
}) {
  const [fromGuest, setFromGuest] = useState(defaultFrom || 1);
  const [toGuest, setToGuest] = useState(1);
  const [pick, setPick] = useState(() => new Map()); // itemId -> qty

  useEffect(() => {
    if (open) {
      setFromGuest(defaultFrom || 1);
      setToGuest(1);
      const m = new Map();
      items
        .filter(i => (i.guestId || 1) === (defaultFrom || 1))
        .forEach(it => m.set(it.id, 0));
      setPick(m);
    }
  }, [open, defaultFrom, items]);

  const sourceRows = useMemo(() => {
    const list = items.filter(i => (i.guestId || 1) === fromGuest);
    return list.map(it => {
      const p = products.find(x => x.id === it.productId);
      const name = p?.name ?? 'Artikal';
      const unit = it.priceEach ?? p?.price ?? 0;
      const sel = pick.get(it.id) || 0;
      return { item: it, product: p, name, unit, selected: sel };
    });
  }, [items, products, fromGuest, pick]);

  const selQty = sourceRows.reduce((s, r) => s + r.selected, 0);
  const selAmt = sourceRows.reduce((s, r) => s + r.selected * r.unit, 0);

  function inc(it) {
    setPick(prev => {
      const m = new Map(prev);
      const cur = m.get(it.id) || 0;
      m.set(it.id, Math.min(it.qty, cur + 1));
      return m;
    });
  }
  function dec(it) {
    setPick(prev => {
      const m = new Map(prev);
      const cur = m.get(it.id) || 0;
      m.set(it.id, Math.max(0, cur - 1));
      return m;
    });
  }

  async function confirm() {
    const moves = sourceRows.filter(r => r.selected > 0).map(r => ({ item: r.item, qty: r.selected }));
    if (!moves.length || fromGuest === toGuest) { onClose(); return; }

    if (quickMode) {
      setItems(prev => {
        let next = [...prev];
        for (const m of moves) {
          // skini sa izvornog
          next = next
            .map(it => it.id === m.item.id ? { ...it, qty: it.qty - m.qty } : it)
            .filter(it => it.qty > 0);

          // dodaj/akumuliraj na odredišnom gostu
          const idx = next.findIndex(
            x => x.productId === m.item.productId && (x.guestId || 1) === toGuest
          );
          if (idx >= 0) {
            next[idx] = { ...next[idx], qty: (next[idx].qty || 0) + m.qty };
          } else {
            next.push({
              id: crypto.randomUUID(),
              productId: m.item.productId,
              qty: m.qty,
              priceEach: m.item.priceEach,
              guestId: toGuest
            });
          }
        }
        return next;
      });
    } else {
      // baza
      for (const m of moves) {
        const it = await db.table('orderItems').get(m.item.id);
        if (!it) continue;
        const newQty = (it.qty || 0) - m.qty;
        if (newQty <= 0) await db.table('orderItems').delete(it.id);
        else await db.table('orderItems').update(it.id, { qty: newQty });

        const existingDest = await db.table('orderItems')
          .where({ orderId, productId: it.productId, guestId: toGuest })
          .first();
        if (existingDest) {
          await db.table('orderItems').update(existingDest.id, { qty: (existingDest.qty || 0) + m.qty });
        } else {
          await db.table('orderItems').add({
            orderId, productId: it.productId, qty: m.qty, priceEach: it.priceEach, guestId: toGuest
          });
        }
      }
      const refreshed = await db.table('orderItems').where('orderId').equals(orderId).toArray();
      setItems(refreshed);
    }
    onClose();
  }

  if (!open) return null;

  const segBtn = (active) =>
    `px-3 py-2 rounded-xl border transition touch-btn ${
      active
        ? 'bg-brand/20 border-brand text-neutral-900 dark:text-white'
        : 'bg-[var(--surface)] border-neutral-200/80 dark:border-neutral-800'
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl w-[min(800px,96vw)] max-h-[92vh] overflow-hidden fade-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10">
          <div className="text-lg font-semibold inline-flex items-center gap-2">
            <Users size={18}/> Podeli — sa gosta na gosta
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 touch-btn"
          >
            Zatvori
          </button>
        </div>

        {/* Telo */}
        <div className="p-4 space-y-4">
          {/* Pickers */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-semibold mb-1 inline-flex items-center gap-1">
                <User size={14}/> Izvorni gost
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: MAX_GUESTS }).map((_, i) => {
                  const g = i + 1;
                  return (
                    <button key={g} className={segBtn(fromGuest === g)} onClick={() => setFromGuest(g)}>
                      G{g}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1 inline-flex items-center gap-1">
                <ArrowRight size={14}/> Odredišni gost
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: MAX_GUESTS }).map((_, i) => {
                  const g = i + 1;
                  return (
                    <button key={g} className={segBtn(toGuest === g)} onClick={() => setToGuest(g)}>
                      G{g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lista stavki */}
          <div className="max-h-[50vh] overflow-auto no-scrollbar space-y-2">
            {sourceRows.map(r => {
              const lineTotal = (r.item.qty * r.unit).toFixed(2);
              return (
                <div key={r.item.id} className="border rounded-xl px-3 py-2 flex items-center justify-between dark:border-neutral-800">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs opacity-80">
                      {r.item.qty} × {r.unit.toFixed(2)} = <b>{lineTotal} RSD</b>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dec(r.item)}
                      className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-800 touch-btn"
                    >
                      <Minus size={16}/>
                    </button>
                    <div className="w-10 text-center font-semibold">{r.selected}</div>
                    <button
                      onClick={() => inc(r.item)}
                      className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-800 touch-btn"
                    >
                      <Plus size={16}/>
                    </button>
                  </div>
                </div>
              );
            })}
            {sourceRows.length === 0 && <div className="opacity-70">Nema stavki kod izabranog gosta.</div>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-sm opacity-80 inline-flex items-center gap-2">
              <Package size={14}/> Izabrano: <b>{selQty}</b> kom · <Coins size={14}/> <b>{selAmt.toFixed(2)} RSD</b>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 touch-btn"
              >
                Otkaži
              </button>
              <button
                onClick={confirm}
                disabled={selQty === 0 || fromGuest === toGuest}
                className="px-3 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white touch-btn"
              >
                Prebaci
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
