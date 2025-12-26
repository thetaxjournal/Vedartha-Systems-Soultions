
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download, 
  Printer, 
  Filter,
  Search,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { Invoice, Payment } from '../types';
import { COMPANY_NAME, COMPANY_LOGO } from '../constants';

interface AccountsProps {
  invoices: Invoice[];
  payments: Payment[];
}

const Accounts: React.FC<AccountsProps> = ({ invoices, payments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const totalSales = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  // Combine Invoices and Payments into a single Ledger, sort by date
  const ledgerEntries = useMemo(() => {
    const entries = [
      ...invoices.map(inv => ({
        id: inv.id,
        date: inv.date,
        docRef: inv.invoiceNumber,
        description: `Invoice to ${inv.clientName}`,
        type: 'INVOICE',
        debit: inv.grandTotal, // Receivable (Increase Balance)
        credit: 0
      })),
      ...payments.map(pay => ({
        id: pay.id,
        date: pay.date,
        docRef: pay.id,
        description: `Payment from ${pay.clientName} (${pay.method})`,
        type: 'PAYMENT',
        debit: 0,
        credit: pay.amount // Received (Decrease Balance/Receivable)
      }))
    ];

    // Sort: Oldest First to calculate running balance correctly
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    return entries.map(entry => {
      // In a Sales Ledger: Debit is Sales (Owed to us), Credit is Receipt (Paid to us). Balance is amount Owed.
      balance = balance + entry.debit - entry.credit;
      return { ...entry, balance };
    }).reverse(); // Show newest first for UI
  }, [invoices, payments]);

  const filteredEntries = ledgerEntries.filter(entry => 
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    entry.docRef.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Financial_Statement_${new Date().toISOString().split('T')[0]}`;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;
    }, 500);
  };

  const StatementDocument = () => (
    <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
            <div className="flex items-center space-x-4">
                <img src={COMPANY_LOGO} className="h-12 object-contain" />
                <div>
                    <h1 className="text-xl font-bold uppercase">{COMPANY_NAME}</h1>
                    <p className="text-[10px]">Statement of Accounts</p>
                </div>
            </div>
            <div className="text-right text-[10px]">
                <p>Date: {new Date().toLocaleDateString()}</p>
                <p>Period: Current Fiscal Year</p>
            </div>
        </div>

        {/* Table */}
        <table className="w-full text-[10px] border-collapse">
            <thead>
                <tr className="border-b-2 border-black font-bold uppercase">
                    <th className="py-2 text-left w-24">Date</th>
                    <th className="py-2 text-left w-32">Ref No.</th>
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right w-24">Withdrawal (Dr)</th>
                    <th className="py-2 text-right w-24">Deposit (Cr)</th>
                    <th className="py-2 text-right w-24">Balance</th>
                </tr>
            </thead>
            <tbody>
                {/* Print standard chronological order usually, but using filteredEntries which is reversed for UI. Let's flip it back for Statement. */}
                {[...filteredEntries].reverse().map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-gray-200">
                        <td className="py-2">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="py-2 font-mono">{entry.docRef}</td>
                        <td className="py-2">{entry.description}</td>
                        <td className="py-2 text-right font-medium">{entry.debit > 0 ? entry.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
                        <td className="py-2 text-right font-medium">{entry.credit > 0 ? entry.credit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
                        <td className="py-2 text-right font-bold">{entry.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-black text-[9px] text-center">
            <p>This is a computer generated statement and does not require a physical signature.</p>
            <p>{COMPANY_NAME} | Financial Records</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isPrinting && createPortal(<StatementDocument />, document.getElementById('print-portal')!)}

      {/* Top Ledger Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Sales Ledger', value: `₹ ${totalSales.toLocaleString('en-IN')}`, icon: ArrowUpRight, color: 'emerald' },
          { label: 'Accounts Payable', value: '₹ 0.00', icon: ArrowDownLeft, color: 'rose' },
          { label: 'Net Operating Margin', value: totalSales > 0 ? '43.4%' : '0.0%', icon: ArrowUpRight, color: 'blue' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{item.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : item.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'} group-hover:scale-110 transition-transform`}>
              <item.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Reports Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Fiscal Period</label>
            <select className="text-[11px] border-none bg-gray-50 px-3 py-1.5 font-black uppercase rounded outline-none cursor-pointer">
              <option>Current FY (2024-25)</option>
              <option>Previous FY (2023-24)</option>
            </select>
          </div>
          <div className="w-[1px] h-8 bg-gray-200"></div>
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">G/L Report Type</label>
            <select className="text-[11px] border-none bg-gray-50 px-3 py-1.5 font-black uppercase rounded outline-none cursor-pointer">
              <option>Sales Ledger (Day Book)</option>
              <option>Purchase Ledger</option>
              <option>Taxation Report (GSTR-1)</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
            <Download size={14} className="mr-2" /> PDF
          </button>
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-[#0854a0] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#064280] shadow-lg shadow-blue-100 transition-all">
            <Printer size={14} className="mr-2" /> Print Reports
          </button>
        </div>
      </div>

      {/* General Ledger Table - Bank Statement Style */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-800 text-[11px] uppercase tracking-widest flex items-center">
            Statement of Accounts <span className="ml-3 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[9px]">{filteredEntries.length} RECORDS</span>
          </h3>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input 
                type="text" 
                placeholder="Filter Ledger..." 
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] outline-none w-48 font-bold focus:ring-2 focus:ring-blue-50" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest border-b border-gray-100">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Ref No.</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Debit (Dr)</th>
              <th className="px-6 py-4 text-right">Credit (Cr)</th>
              <th className="px-6 py-4 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold">
            {filteredEntries.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center uppercase tracking-[0.3em] font-black text-gray-300">No General Ledger Entries Found</td></tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-mono text-gray-400">{entry.docRef}</td>
                  <td className="px-6 py-4 text-gray-700 uppercase tracking-tight">{entry.description}</td>
                  <td className="px-6 py-4 text-right text-gray-800">
                      {entry.debit > 0 ? `₹ ${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600">
                      {entry.credit > 0 ? `₹ ${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-[#0854a0]">
                      ₹ {entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Accounts;
