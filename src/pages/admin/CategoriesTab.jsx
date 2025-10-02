import { useState } from 'react'
import { db } from '../../store/db.js'
import { Card, Button } from '../../components/UI.jsx'
import * as Icons from 'lucide-react'

const ICONS = ['Coffee','Beer','Wine','Martini','GlassWater','CupSoda','Utensils','Pizza','IceCream','Cake','Cookie','Croissant','Soup','Salad','Sandwich','Zap','Apple','Fish','Drumstick']
const I = (n)=> Icons[n] || Icons.Utensils

export default function CategoriesTab({ categories, onChange }){
  const [name, setName] = useState('')
  const [sort, setSort] = useState( (categories.at(-1)?.sort ?? 0) + 1 )
  const [icon, setIcon] = useState('Utensils')

  async function addCat(){
    if (!name.trim()) return
    await db.table('categories').add({ name: name.trim(), sort: Number(sort)||0, icon })
    setName(''); setSort((Number(sort)||0)+1); onChange()
  }
  async function delCat(id){ if (confirm('Obrisati kategoriju?')){ await db.table('categories').delete(id); onChange() } }
  async function updateCat(c){ await db.table('categories').update(c.id, { name:c.name, sort:c.sort, icon:c.icon }); onChange() }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <div className="text-lg font-semibold mb-3">Dodaj kategoriju</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Naziv" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900"/>
          <input value={sort} onChange={e=>setSort(e.target.value)} type="number" placeholder="Sort" className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900"/>
          <select value={icon} onChange={e=>setIcon(e.target.value)} className="px-3 py-2 rounded-xl border bg-white dark:bg-neutral-900">
            {ICONS.map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="mt-3"><Button onClick={addCat}>Sačuvaj</Button></div>
      </Card>

      <Card>
        <div className="text-lg font-semibold mb-3">Sve kategorije</div>
        <div className="space-y-2">
          {categories.map(c=>{
            const Icon = I(c.icon)
            return (
              <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border rounded-xl px-3 py-2 dark:border-neutral-800">
                <input defaultValue={c.name} onBlur={e=>updateCat({ ...c, name:e.target.value })} className="px-2 py-1 rounded-lg border bg-white dark:bg-neutral-900"/>
                <input type="number" defaultValue={c.sort} onBlur={e=>updateCat({ ...c, sort:Number(e.target.value)||0 })} className="w-20 px-2 py-1 rounded-lg border bg-white dark:bg-neutral-900 text-right"/>
                <select defaultValue={c.icon} onChange={e=>updateCat({ ...c, icon:e.target.value })} className="px-2 py-1 rounded-lg border bg-white dark:bg-neutral-900">
                  {ICONS.map(n=> <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={()=>delCat(c.id)} className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700">Obriši</button>
              </div>
            )
          })}
          {categories.length===0 && <div className="opacity-70">Nema kategorija.</div>}
        </div>
      </Card>
    </div>
  )
}
