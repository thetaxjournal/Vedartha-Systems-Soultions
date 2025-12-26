
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanLine, CheckCircle2, XCircle, ShieldCheck, Loader2, FileText, Receipt, ArrowRight, Calendar, MapPin, Building2 } from 'lucide-react';
import { decodeSecureQR, COMPANY_LOGO } from '../constants';
import { Invoice, Payment } from '../types';

interface ScannerProps {
  invoices: Invoice[];
  payments: Payment[];
}

const Scanner: React.FC<ScannerProps> = ({ invoices, payments }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          handleScan(decodedText);
        },
        (errorMessage) => {
          // ignore frames without QR
        }
      );
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const handleScan = (text: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanResult(text);
    
    const decoded = decodeSecureQR(text);
    
    if (decoded && decoded._sec === 'VED') {
      setDecodedData(decoded);
      setError(null);
    } else {
      setDecodedData(null);
      setError("This QR code is not recognized by the Vedartha Secure System. It may be a standard QR or from an external source.");
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setDecodedData(null);
    setError(null);
    setIsScanning(true);
  };

  const renderDetails = () => {
     if (!decodedData) return null;

     // Try to find fresh data from the DB via props, fallback to QR data
     const dbInvoice = invoices.find(i => i.id === decodedData.id);
     const dbPayment = payments.find(p => p.id === decodedData.id);

     const data = dbInvoice || dbPayment || decodedData;
     const type = decodedData.type;

     return (
       <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-[#0854a0] p-6 text-white flex justify-between items-center">
             <div className="flex items-center space-x-3">
                <ShieldCheck size={28} className="text-emerald-400" />
                <div>
                   <h3 className="text-lg font-black uppercase tracking-wider">Secure Verification</h3>
                   <p className="text-[10px] opacity-80 font-medium">Vedartha Digital Signature Validated</p>
                </div>
             </div>
             <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono">
                {new Date().toLocaleTimeString()}
             </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
             <div className="text-center mb-8">
                <img src={COMPANY_LOGO} className="h-10 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-gray-800">{type === 'INV' ? 'TAX INVOICE' : 'PAYMENT RECEIPT'}</h2>
                <p className="text-sm font-bold text-[#0854a0]">{data.invoiceNumber || data.id}</p>
             </div>

             <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billed To / Client</label>
                   <p className="font-bold text-gray-800 mt-1">{data.clientName}</p>
                   {data.clientGstin && <p className="text-[10px] text-gray-500 font-mono mt-1">GST: {data.clientGstin}</p>}
                </div>
                <div className="text-right">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                   <div className="flex items-center justify-end text-gray-800 mt-1 font-bold">
                      <Calendar size={14} className="mr-2 text-gray-400" />
                      {new Date(data.date).toLocaleDateString()}
                   </div>
                   <div className="mt-2">
                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${data.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {data.status || 'Verified'}
                       </span>
                   </div>
                </div>
             </div>

             {/* Invoice Specific Details */}
             {type === 'INV' && data.items && (
               <div className="mb-8">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Line Items</h4>
                  <div className="space-y-3">
                     {data.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-2 last:border-0">
                           <div className="flex-1 pr-4">
                              <p className="font-bold text-gray-700">{item.description}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">HSN: {item.hsnCode} | Qty: {item.quantity}</p>
                           </div>
                           <p className="font-mono font-bold text-gray-900">₹ {(item.rate * item.quantity).toLocaleString('en-IN')}</p>
                        </div>
                     ))}
                  </div>
               </div>
             )}

             {/* Financials */}
             <div className="space-y-3 pt-4 border-t-2 border-dashed border-gray-200">
                {data.subTotal && (
                   <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Sub Total</span>
                      <span>₹ {data.subTotal.toLocaleString('en-IN')}</span>
                   </div>
                )}
                {data.taxAmount && (
                   <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Tax (GST 18%)</span>
                      <span>₹ {data.taxAmount.toLocaleString('en-IN')}</span>
                   </div>
                )}
                <div className="flex justify-between text-xl font-black text-[#0854a0] pt-2">
                   <span>Total Value</span>
                   {/* Safely handle potentially undefined grandTotal or amount */}
                   <span>₹ {((data.grandTotal || data.amount) || 0).toLocaleString('en-IN')}</span>
                </div>
             </div>
          </div>

          <div className="bg-gray-50 p-4 flex justify-center">
             <button onClick={handleReset} className="flex items-center px-8 py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                Scan Next Document <ArrowRight size={16} className="ml-2" />
             </button>
          </div>
       </div>
     );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] animate-in fade-in duration-500 space-y-8 pb-20">
       {!decodedData && (
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-lg mb-4">
               <ScanLine size={32} className="text-[#0854a0]" />
            </div>
            <h2 className="text-2xl font-black text-[#1c2d3d] uppercase tracking-tighter">Portal Security Scanner</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Point camera at Vedartha Secure QR Code</p>
         </div>
       )}

       {isScanning ? (
         <div className="relative w-[350px] h-[350px] bg-black rounded-[40px] overflow-hidden border-8 border-gray-200 shadow-2xl">
            <div id="reader" className="w-full h-full object-cover"></div>
            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
               <div className="w-56 h-56 border-2 border-white/50 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/50 animate-pulse shadow-[0_0_10px_#10b981]"></div>
               </div>
            </div>
            <div className="absolute bottom-6 left-0 right-0 text-center">
               <span className="bg-black/60 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">Scanning Active</span>
            </div>
         </div>
       ) : (
         error ? (
            <div className="flex flex-col items-center text-center p-8 bg-rose-50 rounded-3xl border border-rose-100 max-w-md">
               <XCircle size={64} className="text-rose-500 mb-4" />
               <h3 className="text-xl font-black text-rose-700 uppercase tracking-tight">Access Denied</h3>
               <p className="text-xs font-bold text-rose-500 mt-2">{error}</p>
               <button onClick={handleReset} className="mt-8 px-8 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700">Scan Again</button>
            </div>
         ) : renderDetails()
       )}
    </div>
  );
};

export default Scanner;
