// src/pages/pos/components/ActionBar.jsx
import { Button } from '../../../components/UI.jsx';
import { Printer, ArrowLeftRight, Scissors, Usb } from 'lucide-react';
import { connectUsbPrinter } from '../hooks/usePrinting.js';

export default function ActionBar({ onPrint, onSplitOpen, onTransfer, printLabel }){
  async function handleConnect() {
    const res = await connectUsbPrinter();
    if (!res.ok) alert(res.error || 'Povezivanje neuspešno');
    else alert('USB štampač povezan — sledeće štampe idu bez dijaloga.');
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Gornji red: Poveži štampač + Podeli (i Prebaci ako postoji) */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onSplitOpen} className="w-full bg-neutral-700 hover:bg-neutral-600 touch-btn flex items-center justify-center gap-2">
          <Scissors size={18}/> Podeli
        </Button>
        {onTransfer ? (
          <Button onClick={onTransfer} className="w-full bg-neutral-700 hover:bg-neutral-600 touch-btn flex items-center justify-center gap-2">
            <ArrowLeftRight size={18}/> Prebaci
          </Button>
        ) : (
          <Button onClick={handleConnect} className="w-full bg-neutral-700 hover:bg-neutral-600 touch-btn flex items-center justify-center gap-2">
            <Usb size={18}/> Poveži štampač
          </Button>
        )}
      </div>

      {/* Donji red: Štampaj */}
      <Button onClick={onPrint} className="w-full touch-btn flex items-center justify-center gap-2">
        <Printer size={18}/> {printLabel}
      </Button>
    </div>
  );
}
