// src/pages/pos/components/TransferModal.jsx
import { useEffect, useMemo, useState, useRef } from 'react';
import { db, ensureOpenOrderForTable, transferItemsBetweenTables } from '../../../store/db.js';
import { Users, User, MoveRight, ArrowLeftRight, Coffee, Check } from 'lucide-react';
import { MAX_GUESTS, GUEST_ALL } from '../constants.js';

const TABLE_SIZE = 46;

const pctFromLegacy = (t)=>{
  if (typeof t.xpct==='number' && typeof t.ypct==='number') return { xpct:t.xpct, ypct:t.ypct };
  if (typeof t.x==='number' && typeof t.y==='number'){
    return { xpct: Math.min(1, Math.max(0, (t.x+0.5)/24)), ypct: Math.min(1, Math.max(0, (t.y+0.5)/14)) };
  }
  return { xpct:0.1, ypct:0.1 };
};

export default function TransferModal({ open, onClose, fromOrderId, sourceTableId, onDone, defaultGuest=1 }){
  const [mode, setMode] = useState('table');
  const [fromGuest, setFromGuest] = useState(defaultGuest || 1);
  const [toGuest, setToGuest] = useState(1);
  const [tables, setTables] = useState([]);
  const [ordersOpen, setOrdersOpen] = useState([]);
  const [items, setItems] = useState([]);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [natSize, setNatSize] = useState({ w: 0, h: 0 });
  const [imgBox, setImgBox] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(()=>{
    if (!open) return;
    (async ()=>{
      const [t, oo, it] = await Promise.all([
        db.table('posTables').toArray().catch(()=>[]),
        db.table('orders').where('status').equals('open').toArray().catch(()=>[]),
        db.table('orderItems').toArray().catch(()=>[]),
      ]);
      setTables(t); setOrdersOpen(oo); setItems(it);
    })();
    setMode('table');
    setFromGuest(defaultGuest || 1);
    setToGuest(1);
  }, [open, defaultGuest]);

  function onImgLoad(e){
    const img = e.currentTarget;
    setNatSize({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    calcImgBox();
  }

  const calcImgBox = ()=>{
    const host = containerRef.current;
    if (!host || !natSize.w || !natSize.h) return;

    const W = host.clientWidth;
    const H = host.clientHeight;
    const r = natSize.w / natSize.h;

    let dispW, dispH, left, top;
    if (W / H < r) {
      dispW = W;
      dispH = W / r;
      left = 0;
      top = Math.max(0, (H - dispH) / 2);
    } else {
      dispH = H;
      dispW = H * r;
      left = 0;
      top = 0;
    }
    setImgBox({ left, top, width: dispW, height: dispH });
  };

  useEffect(()=>{
    if (!open) return;
    calcImgBox();
    const onResize = ()=> calcImgBox();
    window.addEventListener('resize', onResize);
    return ()=> window.removeEventListener('resize', onResize);
  }, [open, natSize.w, natSize.h]);

  const occupied = useMemo(()=>{
    const qtyByOrder = items.reduce((m,i)=> (m[i.orderId]=(m[i.orderId]||0)+i.qty, m), {});
    const busy = new Set(); for (const o of ordersOpen){ if ((qtyByOrder[o.id]||0) > 0) busy.add(o.tableId) }
    return busy;
  }, [ordersOpen, items]);

  if (!open) return null;

  async function handlePickTable(destTableId){
    if (destTableId === sourceTableId) return;
    await ensureOpenOrderForTable(destTableId);
    const moveWholeTable = (mode === 'table');
    const fromGuestId = moveWholeTable ? null : (fromGuest === GUEST_ALL ? null : fromGuest);
    const toGuestId = moveWholeTable ? null : toGuest;
    await transferItemsBetweenTables({
      fromOrderId,
      fromGuestId,
      toTableId: destTableId,
      toGuestId
    });
    onDone?.(destTableId);
  }

  const baseBtn = "px-3 py-2 rounded-xl border transition touch-btn";
  const segBtn = (active)=> `${baseBtn} ${active ? 'bg-brand/20 border-brand text-neutral-900 dark:text-white' : 'bg-[var(--surface)] border-neutral-200/80 dark:border-neutral-800'}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={onClose} />
      {/* === Veći modal (skoro fullscreen) === */}
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-[96vw] h-[92vh] overflow-hidden fade-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10">
          <div className="text-lg font-semibold flex items-center gap-2">
            <ArrowLeftRight size={18}/> Prebaci na drugi sto
          </div>
          <button onClick={onClose} className={`${baseBtn} bg-neutral-100 dark:bg-neutral-800`}>Zatvori</button>
        </div>

        <div className="p-4 grid lg:grid-cols-[280px_1fr] gap-4 h-[calc(100%-52px)]">
          {/* Levo: kontrole */}
          <div className="space-y-3 overflow-y-auto">
            <div className="text-sm font-semibold">Način</div>
            <div className="grid grid-cols-2 gap-2">
              <button className={segBtn(mode==='guest')} onClick={()=>setMode('guest')}>
                <div className="flex items-center gap-2"><User size={16}/> Gost → Sto</div>
                <div className="text-[11px] opacity-70">prebaci jednog gosta</div>
              </button>
              <button className={segBtn(mode==='table')} onClick={()=>setMode('table')}>
                <div className="flex items-center gap-2"><Users size={16}/> Sto → Sto</div>
                <div className="text-[11px] opacity-70">prebaci ceo sto</div>
              </button>
            </div>

            {mode==='guest' && (
              <>
                <div className="text-sm font-semibold mt-2">Izvorni gost</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={segBtn(fromGuest===GUEST_ALL)}
                    onClick={()=>setFromGuest(GUEST_ALL)}
                    title="Svi gosti"
                  >
                    Svi
                  </button>
                  {Array.from({length:MAX_GUESTS}).map((_,i)=>{
                    const g=i+1;
                    return (
                      <button key={g} className={segBtn(fromGuest===g)} onClick={()=>setFromGuest(g)}>
                        G{g}
                      </button>
                    );
                  })}
                </div>

                <div className="text-sm font-semibold mt-2">Gost na odredištu</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({length:MAX_GUESTS}).map((_,i)=>{
                    const g=i+1;
                    return (
                      <button key={g} className={segBtn(toGuest===g)} onClick={()=>setToGuest(g)}>
                        <MoveRight size={14} className="inline mr-1"/> G{g}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="text-xs opacity-70 mt-2">
              Klikni na sto na mapi da izabereš odredište.
            </div>
          </div>

          {/* Desno: mapa skoro celog ekrana */}
          <div
            ref={containerRef}
            className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          >
            <img
              ref={imgRef}
              src="/tables-bg.gif"
              alt="Mapa lokala"
              className="absolute inset-0 w-full h-full object-contain object-left select-none pointer-events-none"
              onLoad={onImgLoad}
            />

            <div
              className="absolute"
              style={{
                left: imgBox.left,
                top: imgBox.top,
                width: imgBox.width,
                height: imgBox.height
              }}
            >
              <div className="relative w-full h-full">
                {tables.map(t=>{
                  const { xpct, ypct } = pctFromLegacy(t);
                  const isBusy = occupied.has(t.id);
                  const isSame = t.id===sourceTableId;
                  const style = {
                    left: `calc(${(xpct*100).toFixed(3)}% - ${TABLE_SIZE/2}px)`,
                    top:  `calc(${(ypct*100).toFixed(3)}% - ${TABLE_SIZE/2}px)`,
                    width:TABLE_SIZE, height:TABLE_SIZE
                  };
                  return (
                    <button
                      key={t.id}
                      disabled={isSame}
                      onClick={()=>handlePickTable(t.id)}
                      className={`absolute inline-flex items-center justify-center rounded-[3px] text-[11px] font-semibold touch-btn transition shadow-sm border backdrop-blur-[2px]
                        ${isSame ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300' :
                          isBusy ? 'bg-red-600/85 border-red-700 text-white hover:bg-red-600' :
                                   'bg-green-600/85 border-green-700 text-white hover:bg-green-600'
                        }`}
                      style={style}
                      title={t.name}
                    >
                      <Coffee size={14} className="opacity-85 mr-1"/>{t.name}
                      {isSame && <Check size={14} className="absolute -top-2 -right-2 opacity-80" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
