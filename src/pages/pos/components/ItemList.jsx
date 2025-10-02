// src/pages/pos/components/ItemList.jsx
import ItemRow from '../ItemRow.jsx';

export default function ItemList({ items, products, onDec, onInc }){
  return (
    <div className="space-y-2 max-h-[60vh] overflow-auto pr-1 no-scrollbar">
      {items.map(i=> (
        <ItemRow key={i.id} item={i} onDec={()=>onDec(i)} onInc={()=>onInc(i)} products={products} />
      ))}
      {items.length===0 && <div className="opacity-60">Nema stavki za izabranog gosta. Dodajte sa desne strane.</div>}
    </div>
  );
}
