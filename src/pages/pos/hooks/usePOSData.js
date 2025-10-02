// src/pages/pos/hooks/usePOSData.js
import { useEffect, useMemo, useState } from 'react';
import { db, seedIfEmpty, ensureCategoryIcons } from '../../../store/db.js';
import { TAB_ALL, TAB_TOP, GUEST_ALL, MAX_GUESTS } from '../constants.js';

export default function usePOSData({ tableId }) {
  const quickMode = !tableId;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [topIds, setTopIds] = useState([]);
  const [activeGuest, setActiveGuest] = useState(1); // default G1

  useEffect(() => { (async () => {
    await seedIfEmpty();
    await ensureCategoryIcons();

    const cats = await db.table('categories').orderBy('sort').toArray();
    const prods = await db.table('products').toArray();
    setCategories(cats); setProducts(prods);

    const allItems = await db.table('orderItems').toArray();
    const countByProd = allItems.reduce((m, i) => (m[i.productId] = (m[i.productId] || 0) + i.qty, m), {});
    const sorted = Object.entries(countByProd).sort((a,b)=>b[1]-a[1]).map(([id])=>parseInt(id));
    setTopIds(sorted.slice(0, 12));

    if (!quickMode){
      let o = await db.table('orders').where({ tableId, status: 'open' }).first();
      if (!o){
        const id = await db.table('orders').add({ tableId, status: 'open', createdAt: new Date().toISOString() });
        o = await db.table('orders').get(id);
      }
      setOrderId(o.id);
      const it = await db.table('orderItems').where('orderId').equals(o.id).toArray();
      setItems(it);
    } else {
      setOrderId(null);
      setItems([]);
    }
  })(); }, [tableId]);

  // Akcije
  async function addItem(p){
    const g = activeGuest || 1;
    if (quickMode){
      setItems(prev=>{
        const e = prev.find(x=>x.productId===p.id && (x.guestId||1)===g);
        if (e) return prev.map(x=> x.id===e.id ? {...x, qty: x.qty+1, priceEach: p.price, guestId: g } : x);
        return [...prev, { id: crypto.randomUUID(), productId: p.id, qty: 1, priceEach: p.price, guestId: g }];
      });
      return;
    }
    const existing = await db.table('orderItems').where({ orderId, productId: p.id, guestId: g }).first();
    if (existing){
      await db.table('orderItems').update(existing.id, { qty: existing.qty + 1 });
    } else {
      await db.table('orderItems').add({ orderId, productId: p.id, qty: 1, priceEach: p.price, guestId: g });
    }
    const it = await db.table('orderItems').where('orderId').equals(orderId).toArray();
    setItems(it);
  }

  async function changeQty(item, delta){
    if (quickMode){
      setItems(prev=>{
        const q = item.qty + delta;
        if (q <= 0) return prev.filter(x=>x.id!==item.id);
        return prev.map(x=> x.id===item.id ? {...x, qty:q} : x);
      });
      return;
    }
    const q = item.qty + delta;
    if (q <= 0){
      await db.table('orderItems').delete(item.id);
    } else {
      await db.table('orderItems').update(item.id, { qty: q });
    }
    const it = await db.table('orderItems').where('orderId').equals(orderId).toArray();
    setItems(it);
  }

  // Selektori
  const filteredProducts = useMemo(()=>{
    if (activeTab === TAB_ALL) return products;
    if (activeTab === TAB_TOP) return products.filter(p => topIds.includes(p.id));
    return products.filter(p => p.categoryId === activeTab);
  }, [products, activeTab, topIds]);

  const visibleItems = useMemo(()=>{
    if (activeGuest === GUEST_ALL) return items;
    return items.filter(i => (i.guestId||1) === activeGuest);
  }, [items, activeGuest]);

  const qtyByGuest = useMemo(()=>{
    const m = new Map();
    for (let g=1; g<=MAX_GUESTS; g++) m.set(g, 0);
    for (const i of items){
      const g = i.guestId || 1;
      m.set(g, (m.get(g)||0) + i.qty);
    }
    return m;
  }, [items]);

  return {
    // modes & ids
    quickMode, tableId, orderId,
    // data
    categories, products, items, setItems,
    // ui state
    activeTab, setActiveTab, activeGuest, setActiveGuest,
    // computed
    filteredProducts, visibleItems, qtyByGuest,
    // actions
    addItem, changeQty,
  };
}
