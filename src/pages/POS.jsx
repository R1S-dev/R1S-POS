import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/UI.jsx';
import { BackBar } from '../App.jsx';
import { Users } from 'lucide-react';
import { useTheme } from '../store/useTheme.js';

import usePOSData from './pos/hooks/usePOSData.js';
import usePrinting from './pos/hooks/usePrinting.js';

import CategoryTabs from './pos/components/CategoryTabs.jsx';
import ProductGrid from './pos/components/ProductGrid.jsx';
import ItemList from './pos/components/ItemList.jsx';
import TotalsBar from './pos/components/TotalsBar.jsx';
import ActionBar from './pos/components/ActionBar.jsx';
import TransferModal from './pos/components/TransferModal.jsx';
import SplitGuestsModal from './pos/SplitGuestsModal.jsx';

import GuestBtn from './pos/GuestBtn.jsx';
import { GUEST_ALL, MAX_GUESTS } from './pos/constants.js';

export default function POS(){
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { theme } = useTheme();

  const tableId = parseInt(params.get('table') || '0');
  const {
    quickMode, orderId,
    categories, products, items, setItems,
    activeTab, setActiveTab, activeGuest, setActiveGuest,
    filteredProducts, visibleItems, qtyByGuest,
    addItem, changeQty
  } = usePOSData({ tableId });

  const {
    splitOpen, setSplitOpen,
    printActive,
  } = usePrinting({
    quickMode, tableId, orderId,
    items, setItems,
    products,
    activeGuest,
    nav
  });

  const [transferOpen, setTransferOpen] = useState(false);

  const totalForActive = useMemo(() => {
    const src = (activeGuest===GUEST_ALL ? items : items.filter(i => (i.guestId||1)===activeGuest));
    return src.reduce((s,i)=>s+i.qty*(i.priceEach||0),0);
  }, [items, activeGuest]);

  const add = (p)=>addItem(p);
  const dec = (i)=>changeQty(i,-1);
  const inc = (i)=>changeQty(i, 1);

  return (
    <div className="max-w-7xl mx-auto p-4 grid md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <BackBar to="/" label="Nazad na stolove" />
      </div>

      {/* LEVO: Lista stavki / gosti */}
      <Card className="order-2 md:order-1">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">
            {quickMode ? 'Brzo kucanje' : `Sto #${tableId}`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80 hidden sm:inline-flex items-center gap-1"><Users size={16}/>Gosti:</span>
            <GuestBtn
              active={activeGuest===GUEST_ALL}
              glow={false}
              theme={theme}
              onClick={()=>setActiveGuest(GUEST_ALL)}
            >
              Svi
            </GuestBtn>
            {Array.from({length: MAX_GUESTS}).map((_,idx)=>{
              const g = idx+1;
              const count = qtyByGuest.get(g) || 0;
              return (
                <GuestBtn
                  key={g}
                  active={activeGuest===g}
                  glow={count>0}
                  theme={theme}
                  onClick={()=>setActiveGuest(g)}
                >
                  G{g}
                </GuestBtn>
              );
            })}
          </div>
        </div>

        <ItemList items={visibleItems} products={products} onDec={dec} onInc={inc} />

        <TotalsBar
          label={`Ukupno ${activeGuest===GUEST_ALL ? '(svi)' : `(G${activeGuest})`}:`}
          amount={totalForActive}
        />

        {/* UX: gornji red (Podeli, Prebaci) + donji red (Štampaj) */}
        <ActionBar
          onPrint={printActive}
          onSplitOpen={()=>setSplitOpen(true)}
          onTransfer={!quickMode ? ()=>setTransferOpen(true) : undefined}
          printLabel={activeGuest===GUEST_ALL ? 'Štampaj sve' : `Štampaj G${activeGuest}`}
        />
      </Card>

      {/* DESNO: Kategorije + artikli */}
      <Card className="order-1 md:order-2">
        <div className="text-lg font-semibold mb-3">Artikli</div>
        <CategoryTabs
          categories={categories}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ProductGrid
          products={filteredProducts}
          onAdd={add}
          hint={activeGuest===GUEST_ALL ? '→ upis za sto' : `→ upis za G${activeGuest}`}
        />
      </Card>

      {/* Podeli – bez štampe, samo prebacivanje između gostiju */}
      <SplitGuestsModal
        open={splitOpen}
        onClose={()=>setSplitOpen(false)}
        orderId={orderId}
        quickMode={!!quickMode}
        items={items}
        setItems={setItems}
        products={products}
        defaultFrom={activeGuest===GUEST_ALL ? 1 : activeGuest}
      />

      {/* Prebaci na drugi sto – mini mapa sa “odsječenim” delom nava + posle prebacivanja vrati na glavnu mapu */}
      {!quickMode && (
        <TransferModal
          open={transferOpen}
          onClose={()=>setTransferOpen(false)}
          fromOrderId={orderId}
          sourceTableId={tableId}
          defaultGuest={activeGuest===GUEST_ALL ? 1 : activeGuest}
          onDone={()=>{
            setTransferOpen(false);
            // posle prebacivanja — nazad na glavni ekran sa listom stolova
            nav('/');
          }}
        />
      )}
    </div>
  );
}
