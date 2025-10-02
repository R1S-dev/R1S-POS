// src/printing/escpos-usb.js
// WebUSB ESC/POS helper za Epson-kompatibilne termalne USB štampače.
// Prošireni filteri (classCode + više vendorId), robustnije biranje endpointa.

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

// Prošireni vendor ID-ovi (Epson, Star, Bixolon, XPrinter, CH340, STM itd.)
// + classCode filteri: 0x07 (Printer), 0xff (Vendor-specific)
const DEFAULT_FILTERS = [
  // Class-based (hvata i nepoznate vendore)
  { classCode: 0x07 },   // Printer Class
  { classCode: 0xff },   // Vendor specific (mnogi klonovi)

  // Najčešći vendori termalnih štampača / USB-serial bridgeva
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x0519 }, // Star
  { vendorId: 0x1504 }, // Bixolon
  { vendorId: 0x28e9 }, // Magic Control / POS klonovi
  { vendorId: 0x0fe6 }, // ICS
  { vendorId: 0x1cbe }, // Prolific?
  { vendorId: 0x1a86 }, // QinHeng CH340/CH341 (često u jeftinim štampačima)
  { vendorId: 0x0483 }, // STMicro (nekad vendor-specific fw)
  { vendorId: 0x0416 }, // Winbond/Nuvoton (viđano u nekim POS uređajima)
];

export async function ensureConnected({ vendorFilters = DEFAULT_FILTERS } = {}) {
  if (!navigator.usb) throw new Error('WebUSB nije dostupan u ovom pregledaču.');
  if (device?.opened) return true;

  // Ako je već odobren uređaj — uzmi ga
  const allowed = await navigator.usb.getDevices();
  device = allowed[0];

  if (!device) {
    // Zatraži izbor uređaja — koristimo široke filtere
    // (mora iz user gesture-a)
    device = await navigator.usb.requestDevice({ filters: vendorFilters });
  }

  await device.open();
  if (!device.configuration) await device.selectConfiguration(1);

  // Pronađi interfejs i OUT endpoint (može biti alternate setting)
  let found = false;
  let pickedAlt = null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const out = (alt.endpoints || []).find(e => e.direction === 'out');
      if (out) {
        ifaceNumber = iface.interfaceNumber;
        outEndpoint = out.endpointNumber;
        pickedAlt = alt;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    await device.close();
    device = null;
    throw new Error('Nije pronađen izlazni (OUT) endpoint na štampaču.');
  }

  await device.claimInterface(ifaceNumber);
  // Ako alternate setting nije 0, eksplicitno ga selektuj
  if (typeof pickedAlt?.alternateSetting === 'number' && pickedAlt.alternateSetting !== 0) {
    try { await device.selectAlternateInterface(ifaceNumber, pickedAlt.alternateSetting); } catch {}
  }

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
