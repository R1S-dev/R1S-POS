import Dexie from 'dexie'

export const db = new Dexie('predracun_pos')

// v3 schema – dodata tabela "sales" za arhivu štampanih predračuna
db.version(3).stores({
  categories: '++id, name, sort, icon',
  products: '++id, name, price, categoryId, enabled',
  posTables: '++id, name, x, y, xpct, ypct',
  orders: '++id, tableId, createdAt, status, closedAt', // status: open|printed|closed
  orderItems: '++id, orderId, productId, qty, priceEach, guestId',
  sales: '++id, day, ts, orderId, productId, qty, priceEach, productName, categoryId, categoryName',
  zReports: '++id, createdAt, totals'
})

async function ensureOpen(){ if (!db.isOpen()){ try { await db.open() } catch {} } }

/* ================= Seed ================= */
export async function seedIfEmpty(){
  await ensureOpen()
  const catCount = await db.table('categories').count()
  if (catCount > 0) return
  const catIds = await db.table('categories').bulkAdd([
    { name: 'Kafe', sort: 1, icon: 'Coffee' },
    { name: 'Bezalkoholna', sort: 2, icon: 'GlassWater' },
    { name: 'Pivo', sort: 3, icon: 'Beer' },
    { name: 'Žestina', sort: 4, icon: 'Martini' }
  ], { allKeys: true })
  await db.table('products').bulkAdd([
    { name: 'Espresso', price: 180, categoryId: catIds[0], enabled: true },
    { name: 'Kapučino', price: 220, categoryId: catIds[0], enabled: true },
    { name: 'Kola 0.33', price: 200, categoryId: catIds[1], enabled: true },
    { name: 'Pivo 0.5', price: 280, categoryId: catIds[2], enabled: true },
    { name: 'Rakija 0.03', price: 180, categoryId: catIds[3], enabled: true }
  ])
  await db.table('posTables').bulkAdd([
    { name: 'Sto 1', x: 0, y: 0 },
    { name: 'Sto 2', x: 1, y: 0 },
    { name: 'Sto 3', x: 2, y: 0 }
  ])
}

/* ================= Kategorije / import ================= */
const CATEGORY_ICON_MAP = {
  'Kafe': 'Coffee','Topli napici':'Coffee','Čajevi':'Coffee','Kokteli':'Wine','Pivo':'Beer','Vina':'Wine','Žestina':'Martini',
  'Gazirani sokovi':'CupSoda','Negazirani sokovi':'GlassWater','Bezalkoholna':'GlassWater','Vode':'GlassWater','Energetska pića':'Zap',
  'Cider':'Apple','Sladoled':'IceCream','Grickalice':'Cookie','Hrana':'Sandwich','Dodaci':'Plus',
}

const CAT_RULES = [
  { name: 'Kafe', keys: ['espreso','espresso','ristretto','lungo','kapu','capp','latte','makij','macchi','americano','flat white','doppio','moka','mokacc','nes','nescafe'] },
  { name: 'Topli napici', keys: ['topla čokol','topla cokol','čokolada','kakao','toplo mleko','kuvano vino','kuvano pivo'] },
  { name: 'Čajevi', keys: ['čaj','caj','franck','zova čaj','kamilica','nana','zeleni čaj','crni čaj','hibiskus'] },
  { name: 'Pivo', keys: ['pivo','lager','ipa','apa','stout','porter','radler','jelen','lav','heineken','tuborg','zaječarsko','zajecarsko','amstel'] },
  { name: 'Vina', keys: ['vino','merlot','cabernet','chardonnay','rose','grašev','malvaz','prosecco','šardone','vranac','tamjanika'] },
  { name: 'Žestina', keys: ['rakij','vinjak','konjak','brendi','whisk','viski','vodka','tekil','tequil','džin','gin','pelinkov','travar','liker','jeg','jäg','jegerm','jager'] },
  { name: 'Kokteli', keys: ['koktel','mojito','aperol','spritz','negroni','margarita','daiquiri','pina colada','caipir'] },
  { name: 'Gazirani sokovi', keys: ['cola','kola','fanta','sprite','gazir','schweppes','tonic','džin tonik','gin tonic','bitter lemon'] },
  { name: 'Negazirani sokovi', keys: ['sok','voćni','vocni','cedjen','ceđen','juice','narand','jabuk','breskv','borov','brusn','ananas','parad','rajč','rajc','nektar'] },
  { name: 'Vode', keys: ['voda','knjaz','rosa','mineralna'] },
  { name: 'Energetska pića', keys: ['energet','red bull','hell','guarana','monster'] },
  { name: 'Cider', keys: ['cider','somersby','rekorderl','bulmers'] },
  { name: 'Sladoled', keys: ['sladoled','ice cream','gelato'] },
  { name: 'Grickalice', keys: ['čips','cips','kikiriki','smoki','grick','kokice','kreker'] },
  { name: 'Hrana', keys: ['sendvič','sendvic','tost','pomfrit','pica','pizza','burger','kroasan','palač','palac','kolač','kolac','meze','sir','kifla'] },
  { name: 'Dodaci', keys: ['šećer','secer','mleko','mlijeko','led','slamč','slamc','dodat'] },
]

const norm = (s)=> (s||'').toString().trim().toLowerCase()
  .replace(/č/g,'c').replace(/ć/g,'c').replace(/š/g,'s').replace(/ž/g,'z').replace(/đ/g,'dj')

function guessCategory(categoryFromCsv, productName){
  const rawCat = (categoryFromCsv||'').trim()
  if (rawCat){
    const n = norm(rawCat)
    if (/kaf/.test(n)) return 'Kafe'
    if (/topl/.test(n) && /nap/.test(n)) return 'Topli napici'
    if (/caj/.test(n)) return 'Čajevi'
    if (/piv/.test(n)) return 'Pivo'
    if (/vin/.test(n) && !/kuvan/.test(n)) return 'Vina'
    if (/zest|rakij|viski|whisk|vodka|tekil|gin|konjak|brend|liker/.test(n)) return 'Žestina'
    if (/koktel|spritz|negroni|mojit|margarita|daiq|colada|caipir/.test(n)) return 'Kokteli'
    if (/gazir|cola|kola|fanta|sprite|schwepp|tonic/.test(n)) return 'Gazirani sokovi'
    if (/negaz|sok|nectar|nektar|juice|cedj|ceden/.test(n)) return 'Negazirani sokovi'
    if (/vode|voda|mineral/.test(n)) return 'Vode'
    if (/energ|red bull|hell|guarana|monster/.test(n)) return 'Energetska pića'
    if (/cider|somersby|rekorder/.test(n)) return 'Cider'
    if (/sladoled|ice cream|gelato/.test(n)) return 'Sladoled'
    if (/grick|cips|kikiriki|kokice|kreker/.test(n)) return 'Grickalice'
    if (/sendvic|tost|pomfrit|pica|pizza|burger|kroasan|palac|kolac|meze|sir/.test(n)) return 'Hrana'
    if (/dodat|secer|mleko|mlijeko|led|slamc/.test(n)) return 'Dodaci'
  }
  const p = norm(productName||'')
  for (const r of CAT_RULES){ if (r.keys.some(k => p.includes(norm(k)))) return r.name }
  return 'Bezalkoholna'
}

export async function ensureCategoryIcons(){
  await ensureOpen()
  const cats = await db.table('categories').toArray()
  for (const c of cats){ if (!c.icon){ const icon = CATEGORY_ICON_MAP[c.name] || 'Utensils'; await db.table('categories').update(c.id, { icon }) } }
}

export async function importProductsFromRows(rows){
  await ensureOpen()
  const cats = await db.table('categories').orderBy('sort').toArray()
  const byName = new Map(cats.map(c => [c.name.toLowerCase(), c]))
  let nextSort = (cats.at(-1)?.sort ?? 0) + 1
  for (const r of rows){
    const catCsv = (r['Kategorija'] ?? '').toString()
    const prodName = (r['Naziv artikla'] ?? '').toString().trim()
    const priceRaw = r['Cena (RSD)']; if (!prodName) continue
    const normalizedCat = guessCategory(catCsv, prodName)
    let cat = byName.get(normalizedCat.toLowerCase())
    if (!cat){
      const icon = CATEGORY_ICON_MAP[normalizedCat] || 'Utensils'
      const id = await db.table('categories').add({ name: normalizedCat, sort: nextSort++, icon })
      cat = await db.table('categories').get(id); byName.set(normalizedCat.toLowerCase(), cat)
    }
    let price = 0
    if (typeof priceRaw === 'number') price = priceRaw
    else if (typeof priceRaw === 'string') price = parseFloat(priceRaw.replace(/[^\d.,]/g,'').replace(',','.')) || 0
    const exists = await db.table('products').where({ name: prodName, categoryId: cat.id }).first()
    if (exists) continue
    await db.table('products').add({ name: prodName, price, categoryId: cat.id, enabled: true })
  }
}

export async function resetAndImport(rows){
  await ensureOpen()
  await db.table('products').clear()
  await db.table('categories').clear()
  await importProductsFromRows(rows)
  await ensureCategoryIcons()
}

/* ================= Stolovi: set, add, delete ================= */
export async function setTablePct(id, xpct, ypct){
  await ensureOpen()
  await db.table('posTables').update(id, { xpct, ypct })
}

export async function addTable(name='Sto'){
  await ensureOpen()
  const count = await db.table('posTables').count()
  const id = await db.table('posTables').add({ name: `${name} ${count+1}`, xpct: 0.1, ypct: 0.1 })
  return id
}

/** Brisanje dozvoljeno samo ako nema otvorenih stavki na stolu */
export async function deleteTableSafe(id){
  await ensureOpen()
  const open = await db.table('orders').where({ tableId: id, status:'open' }).toArray()
  if (open.length){
    const ids = open.map(o=>o.id)
    const hasItems = await db.table('orderItems').where('orderId').anyOf(ids).count()
    if (hasItems>0) throw new Error('Sto je zauzet (postoje stavke).')
  }
  await db.table('posTables').delete(id)
}

/* ================= POS i arhiva ================= */
export async function ensureOpenOrderForTable(tableId){
  await ensureOpen()
  let o = await db.table('orders').where({ tableId, status:'open' }).first()
  if (!o){
    const id = await db.table('orders').add({ tableId, status:'open', createdAt: new Date().toISOString() })
    o = await db.table('orders').get(id)
  }
  return o.id
}

export async function transferItemsBetweenTables({ fromOrderId, fromGuestId=null, toTableId, toGuestId=null }){
  await ensureOpen()
  const destOrderId = await ensureOpenOrderForTable(toTableId)
  const filter = fromGuestId ? (i)=>(i.guestId||1)===fromGuestId : ()=>true
  const srcItems = (await db.table('orderItems').where('orderId').equals(fromOrderId).toArray()).filter(filter)
  for (const it of srcItems){
    const guestId = toGuestId ?? (it.guestId||1)
    const existing = await db.table('orderItems').where({ orderId: destOrderId, productId: it.productId, guestId }).first()
    if (existing) await db.table('orderItems').update(existing.id, { qty: existing.qty + it.qty })
    else await db.table('orderItems').add({ orderId: destOrderId, productId: it.productId, qty: it.qty, priceEach: it.priceEach, guestId })
    await db.table('orderItems').delete(it.id)
  }
}

export async function archiveOrder(orderId){
  await ensureOpen()
  const order = await db.table('orders').get(orderId); if (!order) return
  const ts = Date.now()
  const d = new Date(order.createdAt || ts)
  const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const items = await db.table('orderItems').where('orderId').equals(orderId).toArray()
  const prods = await db.table('products').toArray()
  const cats = await db.table('categories').toArray()
  const byProd = new Map(prods.map(p=>[p.id,p]))
  const byCat = new Map(cats.map(c=>[c.id,c]))
  const salesRows = items.map(it=>{
    const p = byProd.get(it.productId); const c = p ? byCat.get(p.categoryId) : null
    return { day, ts, orderId, productId: it.productId, qty: it.qty, priceEach: it.priceEach ?? p?.price ?? 0,
             productName: p?.name ?? 'Artikal', categoryId: p?.categoryId ?? null, categoryName: c?.name ?? null }
  })
  if (salesRows.length) await db.table('sales').bulkAdd(salesRows)
  await db.table('orders').update(orderId, { status: 'printed' })
  await db.table('orderItems').where('orderId').equals(orderId).delete()
}
