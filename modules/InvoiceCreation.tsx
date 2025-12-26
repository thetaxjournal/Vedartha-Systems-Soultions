
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Search, 
  X, 
  Zap, 
  Printer,
  Download,
  EyeOff,
  Calendar,
  MessageCircle
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Branch, Client, InvoiceItem, Invoice } from '../types';
import { COMPANY_LOGO, APP_CONFIG, COMPANY_NAME, generateSecureQR } from '../constants';

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    return '';
  };

  let str = '';
  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crores > 0) str += convert(crores) + ' crore ';
  if (lakhs > 0) str += convert(lakhs) + ' lakh ';
  if (thousands > 0) str += convert(thousands) + ' thousand ';
  if (remaining > 0) str += (str !== '' ? '' : '') + convert(remaining);

  return 'Rupees ' + str.trim() + ' only';
};

interface InvoiceCreationProps {
  branches: Branch[];
  activeBranchId: string;
  clients: Client[];
  initialInvoice?: Invoice;
  onPost: (invoice: Invoice) => void;
  onCancel: () => void;
}

const InvoiceCreation: React.FC<InvoiceCreationProps> = ({ branches, activeBranchId, clients, initialInvoice, onPost, onCancel }) => {
  const [activeBranch, setActiveBranch] = useState<Branch | undefined>(branches.find(b => b.id === activeBranchId));
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(initialInvoice ? clients.find(c => c.id === initialInvoice.clientId) : undefined);
  const [clientSearch, setClientSearch] = useState(initialInvoice?.clientName || '');
  const [showClientList, setShowClientList] = useState(false);
  
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.date || new Date().toISOString().split('T')[0]);
  const [kindAttn, setKindAttn] = useState(initialInvoice?.kindAttn || '');
  const [showPreview, setShowPreview] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [items, setItems] = useState<InvoiceItem[]>(initialInvoice?.items || [{ 
    id: '1', 
    description: '', 
    hsnCode: '998311 - Management consulting services', 
    quantity: 1, 
    rate: 0, 
    discountPercent: 0, 
    taxPercent: 18 
  }]);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = branches.find(b => b.id === activeBranchId);
    setActiveBranch(b);
    if (b && !invoiceNumber && !initialInvoice) {
      setInvoiceNumber(`${b.invoicePrefix}${b.nextInvoiceNumber}`);
    }
  }, [activeBranchId, branches, initialInvoice, invoiceNumber]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scrollerRef.current && !scrollerRef.current.contains(event.target as Node)) {
        setShowClientList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subTotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const taxAmount = items.reduce((acc, item) => acc + (item.quantity * item.rate * (item.taxPercent / 100)), 0);
  const grandTotal = subTotal + taxAmount;

  const handleDownloadPDF = async () => {
    const originalTitle = document.title;
    document.title = `${invoiceNumber}_Tax_Invoice`;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;
    }, 500);
  };

  const handleWhatsApp = () => {
    if (!selectedClient) {
      alert("Please select a client to generate the message.");
      return;
    }

    // 1. Prepare PDF Name
    const originalTitle = document.title;
    document.title = `${invoiceNumber}_Tax_Invoice`;
    
    // 2. Render Print View
    setIsPrinting(true);

    // 3. Trigger Print (User saves as PDF)
    setTimeout(() => {
      window.print();
      
      // 4. Cleanup and Open WhatsApp
      setIsPrinting(false);
      document.title = originalTitle;

      const text = `Dear ${selectedClient.name},%0A%0APlease find attached Invoice *${invoiceNumber}* dated ${invoiceDate}.%0A%0A*Total Amount:* ₹ ${grandTotal.toLocaleString('en-IN')}%0A%0ARegards,%0A${COMPANY_NAME}`;
      
      setTimeout(() => {
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }, 1000); // Wait for print dialog to potentially close or settle
    }, 500);
  };

  const InvoiceDocument = () => (
    <div className="flex flex-col text-[#000000]">
      {/* PAGE 1: MAIN INVOICE (A4) */}
      <div 
        id="invoice-render-p1" 
        className="bg-white w-[210mm] min-h-[297mm] p-[15mm] relative text-[#000000] font-sans overflow-hidden flex flex-col"
        style={{ pageBreakAfter: 'always' }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="flex flex-col">
            <img src={COMPANY_LOGO} alt="Logo" className="h-[50px] object-contain mb-1" />
          </div>
          <div className="text-right text-[10px] leading-[1.3] text-[#000000] max-w-[340px] font-medium">
            <p className="font-bold">{activeBranch?.name}</p>
            <p>{activeBranch?.address.line1}, {activeBranch?.address.line2}</p>
            <p>{activeBranch?.address.city} - {activeBranch?.address.pincode}</p>
            <p>{activeBranch?.address.state}, India</p>
            <p className="mt-1">Tel : {activeBranch?.contact}</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-[#000000] mb-3 pb-1 shrink-0">
          <h1 className="text-[16px] font-bold tracking-tight">Tax invoice - Original for recipient</h1>
        </div>

        <div className="grid grid-cols-2 gap-x-12 mb-8 text-[11px] leading-[1.4] shrink-0">
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Invoice no.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{invoiceNumber}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Kind attn.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{kindAttn}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Mailing address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                {selectedClient?.name}<br/>
                {selectedClient?.billingAddress.line1}, {selectedClient?.billingAddress.line2},<br/>
                {selectedClient?.billingAddress.city} - {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
          </div>
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Date</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Client name</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{selectedClient?.name}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                {selectedClient?.billingAddress.line1}, {selectedClient?.billingAddress.line2},<br/>
                {selectedClient?.billingAddress.city} - {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Place of supply</span><span className="w-4 shrink-0 text-center">:</span><span>{activeBranch?.address.state} ({activeBranch?.gstin.slice(0,2)})</span></div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Gstin/Unique id</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold tracking-tight">{selectedClient?.gstin}</span></div>
          </div>
        </div>

        <div className="border-t-[1.5px] border-b-[1.5px] border-[#000000] shrink-0 mt-2">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#000000] font-bold text-[#000000]">
                <th className="text-left py-1.5 pl-1 font-bold">Particulars</th>
                <th className="text-right py-1.5 pr-1 w-40 font-bold">Amount (Inr)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="align-top border-b border-black/10 last:border-0 text-[#000000]">
                  <td className="py-3 pl-1 pr-6 whitespace-pre-wrap leading-relaxed font-medium">
                    <div className="flex items-start">
                      <span className="w-8 shrink-0">{i+1}.</span>
                      <div className="flex-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-1 font-bold">{(item.rate * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4 text-[11px] shrink-0 text-[#000000]">
          <div className="w-72 space-y-1">
            <div className="flex justify-between items-center"><span className="font-bold">Amount</span><span className="w-36 flex justify-between"><span>:</span><span>{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            <div className="flex justify-between items-center"><span className="font-bold">Cgst @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{(taxAmount/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            <div className="flex justify-between items-center"><span className="font-bold">Sgst @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{(taxAmount/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            <div className="h-[1px] bg-[#000000] my-1"></div>
            <div className="flex justify-between font-bold text-[14px]">
              <span className="font-bold">Gross amount</span>
              <span className="w-36 flex justify-between">
                <span>:</span>
                <span className="font-bold">{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="h-[0.5px] bg-[#000000] mt-0.5"></div>
          </div>
        </div>

        <div className="mt-4 text-[11px] font-bold text-[#000000] shrink-0">
          {numberToWords(grandTotal)}
        </div>

        <div className="mt-6 border-t-[1.5px] border-b-[1.5px] border-[#000000] py-3 grid grid-cols-2 gap-x-12 text-[10px] leading-[1.4] text-[#000000] shrink-0">
          <div className="space-y-1">
            <div className="flex"><span className="w-36 font-bold">Pan number</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.pan}</span></div>
            <div className="flex"><span className="w-36 font-bold align-top">Hsn code & description</span><span className="w-4 text-center align-top">:</span>
              <span className="flex-1 font-medium leading-tight">{items[0]?.hsnCode}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex"><span className="w-44 font-bold">Gstin of supplier</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.gstin}</span></div>
            <div className="flex"><span className="w-44 font-bold align-top">Principal place of business</span><span className="w-4 text-center align-top">:</span>
              <div className="flex-1 font-medium leading-tight">
                {activeBranch?.address.line1}, {activeBranch?.address.city} Urban, {activeBranch?.address.state} - {activeBranch?.address.pincode}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col pt-8">
          <div className="flex justify-between items-end mb-6">
            <div className="shrink-0">
              <QRCode 
                value={generateSecureQR({
                    type: 'INV',
                    id: initialInvoice?.id || `INV-${Date.now()}`, // fallback id
                    invoiceNumber,
                    clientName: selectedClient?.name,
                    clientGstin: selectedClient?.gstin,
                    date: invoiceDate,
                    grandTotal,
                    items
                })} 
                size={100} 
                level="M" 
                fgColor="#000000" 
              />
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-medium text-[#000000] mb-1 italic">This document is digitally signed</p>
              <div className="text-right space-y-1">
                 <div className="relative w-64 h-16 border-b border-dotted border-[#000000]"></div>
                 <div className="pt-2">
                   <p className="text-[11px] font-bold">Authorized signatory</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-4 border-t border-black/10 text-[#000000]">
            <div className="text-[9px] font-medium leading-tight opacity-70">
              <p>Branch office: {activeBranch?.address.line1}, {activeBranch?.address.city}, {activeBranch?.address.state} - {activeBranch?.address.pincode}</p>
              <p className="italic text-[8.5px] mt-1">{activeBranch?.name} is part of Vedartha International Limited Group.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div 
        id="invoice-render-p2" 
        className="bg-white w-[210mm] min-h-[297mm] p-[15mm] relative text-[#000000] font-sans overflow-hidden flex flex-col"
        style={{ pageBreakBefore: 'always' }}
      >
        <div className="flex justify-between items-start mb-8 shrink-0">
          <div className="flex flex-col">
            <img src={COMPANY_LOGO} alt="Logo" className="h-[50px] object-contain mb-1" />
          </div>
          <div className="text-right text-[10px] leading-[1.3] text-[#000000] max-w-[340px] font-medium">
            <p className="font-bold">{activeBranch?.name}</p>
            <p>{activeBranch?.address.line1}</p>
            <p>{activeBranch?.address.city} - {activeBranch?.address.pincode}</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-[#000000] mb-4 pb-1 shrink-0">
          <h1 className="text-[16px] font-bold tracking-tight">Tax invoice - Terms & conditions</h1>
        </div>

        <div className="border border-[#000000] p-3 grid grid-cols-2 text-[11px] font-bold mb-10 text-[#000000]">
          <div className="flex"><span className="w-24">Invoice no.</span><span className="px-2">:</span><span>{invoiceNumber}</span></div>
          <div className="flex"><span className="w-24">Date</span><span className="px-2">:</span><span>{new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
        </div>

        <div className="space-y-6 text-[11px] leading-[1.7] text-[#000000] text-justify">
          <p>
            a) This bill is payable by electronic transfer/ dd/ cheque in favor of <span className="font-bold">{activeBranch?.name}</span>. Please make payment within 15 days of receipt of this invoice.
          </p>
          <div className="space-y-1">
            <p>b) Bank details : <span className="font-bold">{APP_CONFIG.bankDetails.bankName}, {APP_CONFIG.bankDetails.address}</span></p>
            <p className="font-bold border-l-2 border-[#000000] pl-4 py-2 mt-2 bg-gray-50/50">
              Account number: {APP_CONFIG.bankDetails.accountNumber}, Rtgs ifsc code: {APP_CONFIG.bankDetails.ifscCode}
            </p>
          </div>
          <p>
            c) For payment made by electronic fund transfer, please send details to <span className="font-bold underline">receipt@vedartha.com</span> quoting invoice number <span className="font-bold">{invoiceNumber}</span>.
          </p>
        </div>

        <div className="mt-auto flex flex-col pt-6 border-t border-black/10">
          <div className="text-[9px] font-medium opacity-70">
             <p>Branch office: {activeBranch?.address.line1}, {activeBranch?.address.city}, {activeBranch?.address.state} - {activeBranch?.address.pincode}</p>
          </div>
          <div className="flex justify-end mt-2">
            <span className="text-[10px] font-medium">Page 2</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-[#f3f4f7] overflow-hidden no-print">
      {isPrinting && createPortal(<InvoiceDocument />, document.getElementById('print-portal')!)}

      <div className={`flex-1 overflow-y-auto p-10 bg-[#eff2f6] border-r border-gray-200 editor-panel ${showPreview ? 'hidden xl:block' : 'block'} custom-scrollbar`}>
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm sticky top-0 z-50 border border-gray-100">
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Create Invoice</h2>
              <p className="text-[10px] font-bold text-blue-500 mt-1">Real-time Financial Orchestration</p>
            </div>
            <div className="flex space-x-3">
              {!showPreview && (
                <button onClick={() => setShowPreview(true)} className="flex items-center px-6 py-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all">
                  <Eye size={18} className="mr-2" /> Show Preview
                </button>
              )}
              <button onClick={() => {
                if (!selectedClient) return alert("Please select a client first.");
                onPost({
                  id: initialInvoice?.id || `INV-${Date.now()}`,
                  invoiceNumber,
                  date: invoiceDate,
                  branchId: activeBranch?.id || '',
                  branchName: activeBranch?.name || '',
                  clientId: selectedClient.id,
                  clientName: selectedClient.name,
                  clientGstin: selectedClient.gstin,
                  kindAttn,
                  items,
                  subTotal,
                  taxAmount,
                  grandTotal,
                  status: 'Posted'
                });
              }} className="bg-[#0854a0] text-white px-8 py-3 rounded-xl text-[11px] font-bold shadow-2xl shadow-blue-100 hover:bg-[#064280] transition-all transform active:scale-95">
                <Zap size={16} className="inline mr-2" /> Post Transaction
              </button>
              <button onClick={onCancel} className="p-3 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="bg-white p-10 rounded-3xl shadow-sm space-y-10 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8" ref={scrollerRef}>
              <div className="space-y-2 relative">
                <label className="text-[11px] font-bold text-gray-500 ml-1">Client master lookup</label>
                <div className="flex items-center border-2 border-gray-100 rounded-2xl px-5 py-4 focus-within:border-[#0854a0] transition-all shadow-sm h-14">
                  <Search size={18} className="text-gray-400 mr-3" />
                  <input className="text-sm font-bold outline-none w-full bg-transparent" placeholder="Search client name..." value={clientSearch} onFocus={() => setShowClientList(true)} onChange={(e) => setClientSearch(e.target.value)} />
                </div>
                {showClientList && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl z-[60] rounded-2xl mt-2 max-h-72 overflow-y-auto">
                    {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <button key={c.id} onClick={() => {setSelectedClient(c); setClientSearch(c.name); setShowClientList(false);}} className="w-full text-left p-5 hover:bg-blue-50 text-[12px] font-bold border-b border-gray-50 flex items-center justify-between transition-colors">
                        <span>{c.name}</span>
                        <span className="text-[10px] text-blue-500 font-mono">{c.gstin}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 ml-1">Invoice posting date</label>
                <div className="flex items-center border-2 border-gray-100 rounded-2xl px-5 py-4 focus-within:border-[#0854a0] transition-all shadow-sm h-14">
                  <Calendar size={18} className="text-gray-400 mr-3 shrink-0" />
                  <input 
                    type="date" 
                    className="text-sm font-bold outline-none w-full bg-transparent" 
                    value={invoiceDate} 
                    onChange={(e) => setInvoiceDate(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 ml-1">Document subject / Attention</label>
                <input className="w-full border-2 border-gray-100 rounded-2xl px-6 h-14 text-sm font-bold focus:border-[#0854a0] outline-none transition-all shadow-sm" value={kindAttn} onChange={(e) => setKindAttn(e.target.value)} placeholder="e.g., Accounts payable manager" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/80">
              <span className="text-[12px] font-bold text-gray-700">Service line items</span>
              <button onClick={() => setItems([...items, { id: Math.random().toString(), description: '', hsnCode: '998311 - Management consulting services', quantity: 1, rate: 0, discountPercent: 0, taxPercent: 18 }])} className="p-3 bg-white text-[#0854a0] rounded-xl border border-gray-200 shadow-sm hover:scale-110 transition-transform"><Plus size={24} /></button>
            </div>
            <div className="divide-y-2 divide-gray-50">
              {items.map((item, idx) => (
                <div key={item.id} className="p-10 space-y-6 relative group hover:bg-gray-50/30 transition-colors">
                  <textarea className="w-full border-2 border-gray-100 rounded-2xl p-5 text-[14px] font-bold text-gray-700 resize-none min-h-[140px] focus:border-[#0854a0] outline-none transition-all shadow-sm" placeholder="Description of service..." value={item.description} onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, description: e.target.value } : it))} />
                  <div className="grid grid-cols-2 gap-8">
                    <input className="w-full border-b-2 border-gray-100 p-3 text-[12px] font-bold text-gray-800 outline-none" placeholder="Hsn code" value={item.hsnCode} onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, hsnCode: e.target.value } : it))} />
                    <input type="number" className="w-full border-b-2 border-gray-100 p-3 text-[16px] font-bold text-[#0854a0] outline-none" placeholder="Rate" value={item.rate} onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, rate: Number(e.target.value) } : it))} />
                  </div>
                  <button onClick={() => setItems(items.filter(it => it.id !== item.id))} className="absolute top-6 right-6 p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="flex-1 bg-[#525659] overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
          <div className="w-full max-w-[210mm] flex justify-between items-center mb-8 text-white px-4 no-print">
            <span className="text-[12px] font-bold tracking-tight">Document preview (A4)</span>
            <div className="flex space-x-4">
              <button onClick={handleWhatsApp} className="flex items-center px-6 py-3.5 bg-green-600 text-white rounded-2xl text-[11px] font-bold transition-all shadow-xl hover:bg-green-500">
                <MessageCircle size={18} className="mr-3" /> WhatsApp
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center px-8 py-3.5 bg-[#0854a0] text-white rounded-2xl text-[11px] font-bold transition-all shadow-xl">
                <Download size={18} className="mr-3" /> Export to PDF
              </button>
              <button onClick={() => setShowPreview(false)} className="flex items-center px-6 py-3.5 bg-white/10 text-white rounded-2xl text-[11px] font-bold border border-white/10 transition-all">
                <EyeOff size={18} className="mr-3" /> Hide preview
              </button>
            </div>
          </div>
          <div className="shadow-2xl">
            <InvoiceDocument />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCreation;
