
import React from 'react';
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
import { Invoice } from '../types';

interface AccountsProps {
  invoices: Invoice[];
}

const Accounts: React.FC<AccountsProps> = ({ invoices }) => {
  const totalSales = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
          <button className="flex items-center px-4 py-2 bg-[#0854a0] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#064280] shadow-lg shadow-blue-100 transition-all">
            <Printer size={14} className="mr-2" /> Print Reports
          </button>
        </div>
      </div>

      {/* General Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-800 text-[11px] uppercase tracking-widest flex items-center">
            General Ledger - Master Postings <span className="ml-3 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[9px]">{invoices.length} VOUCHERS</span>
          </h3>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Filter Ledger..." className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] outline-none w-48 font-bold focus:ring-2 focus:ring-blue-50" />
          </div>
        </div>
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest border-b border-gray-100">
              <th className="px-8 py-5">Value Date</th>
              <th className="px-8 py-5">Doc Reference</th>
              <th className="px-8 py-5">Business Partner</th>
              <th className="px-8 py-5 text-right">Debit (INR)</th>
              <th className="px-8 py-5 text-right">Credit (INR)</th>
              <th className="px-8 py-5 text-center">Lifecycle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold">
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center uppercase tracking-[0.3em] font-black text-gray-300">No General Ledger Entries Found</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-8 py-5 text-gray-500">{inv.date}</td>
                  <td className="px-8 py-5 font-mono font-black text-blue-600 uppercase">{inv.invoiceNumber}</td>
                  <td className="px-8 py-5 uppercase tracking-tight">{inv.clientName}</td>
                  <td className="px-8 py-5 text-right font-black text-gray-900">₹ {(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-5 text-right text-gray-400 font-mono">-</td>
                  <td className="px-8 py-5 text-center">
                    <span className="flex items-center justify-center text-emerald-600 font-black uppercase text-[9px] tracking-widest">
                      <CheckCircle2 size={12} className="mr-2" />
                      Audited
                    </span>
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
