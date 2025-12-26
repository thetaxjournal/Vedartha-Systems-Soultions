
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Receipt, CreditCard, Download, Clock, CheckCircle2, AlertCircle, ChevronRight, LogOut, Printer, X 
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Invoice, Payment, Client, Branch } from '../types';
import { COMPANY_LOGO, COMPANY_NAME, INITIAL_BRANCHES, generateSecureQR } from '../constants';

interface ClientPortalProps {
  user: any;
  clientData: Client | undefined;
  invoices: Invoice[];
  payments: Payment[];
  branches: Branch[];
  onPayInvoice: (invoiceId: string, amount: number) => Promise<Payment | undefined>;
  onLogout: () => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ user, clientData, invoices, payments, branches, onPayInvoice, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fallback to initial if branches prop is empty
  const activeBranches = branches.length > 0 ? branches : INITIAL_BRANCHES;

  // Filter for this specific client
  const myInvoices = invoices.filter(inv => inv.clientId === user.clientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myPayments = payments.filter(pay => pay.invoiceNumber.startsWith('VED') && myInvoices.some(inv => inv.id === pay.invoiceId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePayment = async (inv: Invoice) => {
    if (confirm(`Proceed to pay ₹ ${inv.grandTotal.toLocaleString('en-IN')} for Invoice ${inv.invoiceNumber}? This will simulate a gateway transaction.`)) {
       setProcessingId(inv.id);
       try {
         // Simulate network delay
         await new Promise(resolve => setTimeout(resolve, 2000));
         const payment = await onPayInvoice(inv.id, inv.grandTotal);
         if (payment) {
            setViewingReceipt(payment);
            setActiveTab('payments');
         } else {
            alert('Payment recorded but receipt details unavailable. Check history.');
         }
       } catch (e) {
         alert('Payment failed.');
       } finally {
         setProcessingId(null);
       }
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const totalOutstanding = myInvoices.filter(i => i.status === 'Posted').reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const lastPayment = myPayments.length > 0 ? myPayments[0] : null;

  const ReceiptDocument = ({ payment }: { payment: Payment }) => {
    const inv = invoices.find(i => i.id === payment.invoiceId);
    const branch = activeBranches.find(b => b.id === inv?.branchId) || activeBranches[0];

    const signatureHash = useMemo(() => {
        const raw = `${payment.id}|${payment.amount}|${payment.date}|${payment.reference}|VEDARTHA_SECURE`;
        return btoa(raw).slice(-12).toUpperCase();
    }, [payment]);

    const qrValue = generateSecureQR({
        type: 'RCPT',
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        date: payment.date,
        clientName: payment.clientName,
        reference: payment.reference,
        method: payment.method
    });

    return (
      <div className="bg-white w-[210mm] min-h-[297mm] p-[20mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
        {/* Header - Sentence Case & Pure Black */}
        <div className="flex justify-between items-start mb-12">
          <div className="w-1/3">
            <img src={COMPANY_LOGO} alt="Logo" className="h-12 object-contain" />
          </div>
          <div className="w-1/3 text-center">
            <h1 className="text-[20px] font-bold border-b-2 border-[#000000] inline-block leading-none pb-1">Payment receipt</h1>
          </div>
          <div className="w-1/3 text-right text-[10px] font-medium">
            <p className="mb-1">Receipt id: <span className="text-[12px] font-bold">{payment.id}</span></p>
            <p>{new Date(payment.date).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Address Blocks */}
        <div className="grid grid-cols-2 gap-x-20 mb-10 text-[11px] leading-relaxed">
          <div className="space-y-6">
            <div>
              <p className="font-bold mb-1 text-[9px]">Received from</p>
              <div className="border-l-2 border-[#000000] pl-3 space-y-1">
                <p className="text-[13px] font-bold">{payment.clientName}</p>
                <p>Gstin: {inv?.clientGstin || 'Not provided'}</p>
              </div>
            </div>
            <div className="pl-3 opacity-80">
              <p>{branch.address.line1}</p>
              <p>{branch.address.city}, {branch.address.state}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="font-bold mb-1 text-[9px]">Issued by</p>
              <div className="border-l-2 border-[#000000] pl-3 space-y-1">
                <p className="text-[12px] font-bold">{branch.name}</p>
                <p>Gstin: {branch.gstin}</p>
                <p>Pan: {branch.pan}</p>
              </div>
            </div>
            <div className="pl-3 opacity-80">
              <p>Email: {branch.email}</p>
              <p>Contact: {branch.contact}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-end border-b-2 border-[#000000] pb-2 text-[#000000]">
          <div className="text-[14px] font-bold">System copy</div>
          <div className="text-[10px] font-bold">Currency: Inr</div>
        </div>

        {/* Transaction Table */}
        <div className="flex-1">
          <table className="w-full text-[11px] border-collapse text-[#000000]">
            <thead>
              <tr className="border-b-2 border-[#000000] text-left font-bold">
                <th className="py-2 w-16 font-bold">Sr no</th>
                <th className="py-2 font-bold">Description of transaction</th>
                <th className="py-2 text-center w-32 font-bold">Channel</th>
                <th className="py-2 text-right w-36 font-bold">Value cleared</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b-2 border-[#000000]">
              <tr className="align-top">
                <td className="py-6 font-medium">10</td>
                <td className="py-6 space-y-2">
                  <p className="font-bold text-[12px]">Settlement of invoice: {payment.invoiceNumber}</p>
                  <div className="font-medium text-[10px] opacity-60 italic">
                    Acknowledgment of funds received via {payment.method}. Reference: {payment.reference || 'N/A'}.
                  </div>
                </td>
                <td className="py-6 text-center">{payment.method}</td>
                <td className="py-6 text-right font-bold text-[14px]">₹ {(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals & Signature */}
        <div className="mt-auto pt-10 text-[#000000]">
          <div className="flex justify-between items-start">
            <div className="w-1/2 flex items-center space-x-8">
               <div className="p-1 border border-[#000000]">
                  <QRCode value={qrValue} size={90} level="H" fgColor="#000000" />
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-bold uppercase">Digital signature</p>
                  <p className="text-[10px] font-mono break-all font-medium">{signatureHash}</p>
               </div>
            </div>
            <div className="w-1/3 text-right space-y-3">
              <div className="flex justify-between text-[11px] border-b border-black pb-1 font-medium">
                <span>Gross value</span>
                <span>{(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[18px] font-bold border-b-4 border-double border-black pb-1">
                <span>Net amount</span>
                <span>₹ {(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-black pt-4 flex justify-between items-end text-[9px] font-medium text-black">
             <div className="space-y-1">
                <p className="font-bold">{COMPANY_NAME}</p>
                <p>Enterprise system log: {payment.id}</p>
                <p className="italic opacity-60">This is a system generated document.</p>
             </div>
             <div className="text-right">
                <p>Doc ref: Rcpt/fin/001</p>
                <p>Page 01/01</p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f7] font-sans">
      {/* Hidden Portal for Print */}
      {isPrinting && viewingReceipt && createPortal(<ReceiptDocument payment={viewingReceipt} />, document.getElementById('print-portal')!)}

      {/* Client Header */}
      <header className="bg-[#1c2d3d] text-white py-4 px-8 shadow-lg">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
               <img src={COMPANY_LOGO} alt="Logo" className="h-10 object-contain brightness-0 invert" />
               <div className="h-8 w-[1px] bg-white/20"></div>
               <div>
                  <h1 className="text-lg font-bold tracking-tight">Client Portal</h1>
                  <p className="text-[10px] text-gray-400 font-medium">Welcome, {user.displayName}</p>
                  <p className="text-[10px] text-blue-300 font-mono mt-0.5">Client ID: {user.clientId}</p>
               </div>
            </div>
            <button onClick={onLogout} className="flex items-center text-xs font-bold bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
               <LogOut size={14} className="mr-2" /> Sign Out
            </button>
         </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding Balance</p>
               <h2 className="text-3xl font-black text-[#0854a0] mt-2">₹ {totalOutstanding.toLocaleString('en-IN')}</h2>
               <div className="mt-4 flex items-center text-xs font-bold text-amber-600">
                  <AlertCircle size={14} className="mr-1" /> Action Required
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Payment</p>
               <h2 className="text-3xl font-black text-emerald-600 mt-2">
                  {lastPayment ? `₹ ${lastPayment.amount.toLocaleString('en-IN')}` : '---'}
               </h2>
               <p className="mt-4 text-xs font-bold text-gray-500">
                  {lastPayment ? `On ${new Date(lastPayment.date).toLocaleDateString()}` : 'No history'}
               </p>
            </div>
            <div className="bg-[#0854a0] p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
               <div className="relative z-10">
                  <h3 className="font-bold text-lg">Need Assistance?</h3>
                  <p className="text-xs text-blue-100 mt-1">Contact your relationship manager for billing queries.</p>
                  <button className="mt-6 bg-white text-[#0854a0] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">
                     Contact Support
                  </button>
               </div>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
            <div className="flex border-b border-gray-100">
               <button 
                  onClick={() => setActiveTab('invoices')}
                  className={`flex-1 py-5 text-center text-sm font-bold border-b-2 transition-all ${activeTab === 'invoices' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
               >
                  Invoices & Due Items
               </button>
               <button 
                  onClick={() => setActiveTab('payments')}
                  className={`flex-1 py-5 text-center text-sm font-bold border-b-2 transition-all ${activeTab === 'payments' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
               >
                  Payment History & Receipts
               </button>
            </div>

            <div className="p-8">
               {activeTab === 'invoices' && (
                  <div className="space-y-4">
                     {myInvoices.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">No invoices found.</div>
                     ) : (
                        myInvoices.map(inv => (
                           <div key={inv.id} className="border border-gray-100 rounded-2xl p-6 flex items-center justify-between hover:shadow-md transition-all group">
                              <div className="flex items-center space-x-6">
                                 <div className={`p-4 rounded-xl ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <FileText size={24} />
                                 </div>
                                 <div>
                                    <div className="flex items-center space-x-3">
                                       <h4 className="font-bold text-gray-900">{inv.invoiceNumber}</h4>
                                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {inv.status}
                                       </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Due Date: {new Date(inv.date).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <div className="flex items-center space-x-8">
                                 <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Amount</p>
                                    <p className="text-lg font-black text-gray-900">₹ {inv.grandTotal.toLocaleString('en-IN')}</p>
                                 </div>
                                 {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                                    <button 
                                       onClick={() => handlePayment(inv)}
                                       disabled={!!processingId}
                                       className="bg-[#0854a0] text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg hover:bg-[#064280] transition-all flex items-center disabled:opacity-50"
                                    >
                                       {processingId === inv.id ? 'Processing...' : (
                                          <>Pay Now <ChevronRight size={14} className="ml-2" /></>
                                       )}
                                    </button>
                                 )}
                                 {inv.status === 'Paid' && (
                                    <div className="flex items-center text-emerald-600 font-bold text-xs">
                                       <CheckCircle2 size={16} className="mr-2" /> Paid
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               )}

               {activeTab === 'payments' && (
                  <div className="space-y-4">
                     {myPayments.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">No payment history found.</div>
                     ) : (
                        myPayments.map(pay => (
                           <div key={pay.id} className="border border-gray-100 rounded-2xl p-6 flex items-center justify-between hover:shadow-md transition-all">
                              <div className="flex items-center space-x-6">
                                 <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
                                    <Receipt size={24} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-gray-900">{pay.id}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Paid via {pay.method} on {pay.date}</p>
                                 </div>
                              </div>
                              <div className="flex items-center space-x-8">
                                 <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Amount Paid</p>
                                    <p className="text-lg font-black text-gray-900">₹ {pay.amount.toLocaleString('en-IN')}</p>
                                 </div>
                                 <button onClick={() => setViewingReceipt(pay)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Download Receipt">
                                    <Download size={20} />
                                 </button>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               )}
            </div>
         </div>
      </main>

      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 backdrop-blur-sm no-print">
          <div className="flex flex-col items-center space-y-4 max-h-screen overflow-y-auto w-full py-10">
            <div className="flex space-x-4 mb-4 bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md sticky top-0">
              <button onClick={handlePrint} className="flex items-center px-8 py-3 bg-[#0854a0] text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <Printer size={18} className="mr-3" /> Execute print (A4 black)
              </button>
              <button onClick={() => setViewingReceipt(null)} className="flex items-center px-6 py-3 bg-white text-gray-800 rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <X size={18} className="mr-3" /> Exit
              </button>
            </div>
            <div className="shadow-2xl">
              <ReceiptDocument payment={viewingReceipt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
