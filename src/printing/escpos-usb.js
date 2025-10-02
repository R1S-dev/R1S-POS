// src/printing/escpos-usb.js
// Minimalni WebUSB ESC/POS helper za Epson-kompatibilne USB termalne štampače.

let device = null;
let outEndpoint = 1;
let ifaceNumber = 0;

function enc(text = '') {
  const safe = String(text)
    .replaceAll('č','c').replaceAll('ć','c')
    .replaceAll('š','s').replaceAll('ž','z').replaceAll('đ','dj')
    .replaceAll('Č','C').replaceAll('Ć','C')
    .replaceAll('Š','S').replaceAll('Ž','Z').replaceAll('Đ','Dj');
  return new TextEncoder().encode(safe);
}

function join(...arrs) {
  let total = 0;
  for (const a of arrs) total += a.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

function line(text='') { return join(enc(text), new Uint8Array([0x0A])); }
function hr() { return line('--------------------------------'); }
function money(n) { return (Number(n)||0).toFixed(2); }

// ESC/POS komande
const INIT = new Uint8Array([0x1B,0x40]);
const ALIGN_LEFT   = new Uint8Array([0x1B,0x61,0x00]);
const ALIGN_CENTER = new Uint8Array([0x1B,0x61,0x01]);
const ALIGN_RIGHT  = new Uint8Array([0x1B,0x61,0x02]);
const BOLD_ON  = new Uint8Array([0x1B,0x45,0x01]);
const BOLD_OFF = new Uint8Array([0x1B,0x45,0x00]);
const FEED_5   = new Uint8Array([0x1B,0x64,0x05]);
const CUT_PART = new Uint8Array([0x1D,0x56,0x42,0x00]); // partial cut

export async function usbIsAvailable(){ return !!navigator.usb; }

export async function ensureConnected({
  vendorFilters = [0x04b8, 0x1cb0, 0x28e9], // Epson + uobičajeni klonovi (primer)
} = {}) {
  if (!navigator.usb) throw new Error('WebUSB nije dostupan u ovom pregledaču.');
  if (device?.opened) return true;

  // Ako je već odobren neki uređaj za ovaj origin — uzmi ga
  const allowed = await navigator.usb.getDevices();
  device = allowed[0];

  if (!device) {
    // Traži od korisnika da izabere USB uređaj (mora iz user gesture-a)
    const filters = vendorFilters.filter(Boolean).map(v => ({ vendorId: v }));
    device = await navigator.usb.requestDevice({ filters: filters.length ? filters : undefined });
  }

  await device.open();
  if (!device.configuration) await device.selectConfiguration(1);

  // Nađi interfejs sa OUT endpoint-om
  let found = false;
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const out = alt.endpoints?.find(e => e.direction === 'out');
      if (out) {
        ifaceNumber = iface.interfaceNumber;
        outEndpoint = out.endpointNumber;
        found = true; break;
      }
    }
    if (found) break;
  }
  if (!found) throw new Error('Nije pronađen izlazni endpoint na štampaču.');

  await device.claimInterface(ifaceNumber);
  return true;
}

async function send(bytes){
  if (!device?.opened) throw new Error('USB uređaj nije otvoren.');
  await device.transferOut(outEndpoint, bytes);
}

export async function printReceiptEscpos({ shop, meta, items=[], total=0, warning }){
  const rows = [];
  rows.push(INIT);

  // Header
  rows.push(ALIGN_CENTER, BOLD_ON, line(shop?.name || 'POS'), BOLD_OFF);
  if (shop?.place) rows.push(ALIGN_CENTER, line(shop.place));

  rows.push(hr());
  rows.push(ALIGN_CENTER, BOLD_ON, line(meta?.title || 'PREDRAČUN'), BOLD_OFF);
  rows.push(ALIGN_LEFT, line(`Datum/čas: ${meta?.datetime || ''}`));
  if (meta?.number) rows.push(ALIGN_LEFT, line(`Broj: ${meta.number}`));
  if (meta?.refLeft) rows.push(ALIGN_LEFT, line(`Ref: ${meta.refLeft}`));

  rows.push(hr());
  rows.push(ALIGN_LEFT, BOLD_ON, line('Artikal')); rows.push(BOLD_OFF);
  rows.push(ALIGN_RIGHT, line('Kol × Cena    Iznos'));

  for (const it of items){
    const unit = `${it.qty}× ${money(it.priceEach)}`;
    const sum  = money(it.qty * it.priceEach);
    rows.push(ALIGN_LEFT, line(it.name || 'Artikal'));
    const pad = Math.max(0, 16 - unit.length);
    rows.push(ALIGN_RIGHT, line(`${unit}${' '.repeat(pad)}${sum} RSD`));
  }

  rows.push(hr());
  rows.push(ALIGN_RIGHT, BOLD_ON, line(`UKUPNO: ${money(total)} RSD`), BOLD_OFF);
  if (warning) rows.push(ALIGN_CENTER, line(warning));

  rows.push(ALIGN_CENTER, line(`Štampano: ${meta?.datetime || ''}`));
  rows.push(FEED_5, CUT_PART);

  await send(join(...rows));
}

export async function disconnectUsb(){
  try { if (device?.opened) await device.close(); } catch {}
  device = null;
}
