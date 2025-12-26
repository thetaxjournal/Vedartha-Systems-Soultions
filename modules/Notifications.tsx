
import React from 'react';
import { Mail, Clock, CheckCircle2, User, Ticket, Star, MessageSquare } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsProps {
  notifications: AppNotification[];
  onCloseTicket?: (id: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, onCloseTicket }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 tracking-tight">Support Tickets</h2>
           <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Inbound Client Communications</p>
        </div>
        <div className="bg-blue-50 text-[#0854a0] px-4 py-2 rounded-lg text-xs font-bold">
            {notifications.length} Tickets
        </div>
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <Mail size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No New Tickets</p>
            </div>
        ) : (
            notifications.map((note) => (
                <div key={note.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-mono px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center ${note.status === 'Closed' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Ticket size={12} className="mr-1" />
                            {note.ticketNumber || 'LEGACY'}
                        </span>
                        {note.status !== 'Closed' && onCloseTicket && (
                            <button 
                                onClick={() => onCloseTicket(note.id)}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 hover:border-rose-200 transition-all"
                            >
                                Close Ticket
                            </button>
                        )}
                    </div>
                    <div className="flex justify-between items-start mb-4 pr-24">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-blue-50 text-[#0854a0] rounded-xl">
                                <User size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{note.clientName}</h4>
                                <p className="text-[10px] text-gray-400 font-mono">ID: {note.clientId}</p>
                            </div>
                        </div>
                    </div>
                    <div className="pl-14">
                        <div className="flex items-center text-gray-400 text-[10px] font-bold mb-2">
                            <Clock size={12} className="mr-1" />
                            {new Date(note.date).toLocaleString()}
                        </div>
                        <h5 className="font-bold text-gray-800 text-sm mb-2">{note.subject}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {note.message}
                        </p>
                        
                        {/* Feedback Section */}
                        {note.status === 'Closed' && note.rating && (
                            <div className="mt-4 border-t border-gray-50 pt-4">
                                <div className="flex items-center mb-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Client Feedback:</span>
                                    <div className="flex text-amber-400">
                                        {[...Array(note.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                    </div>
                                </div>
                                {note.feedback && (
                                    <p className="text-xs text-gray-500 italic flex items-start">
                                        <MessageSquare size={12} className="mr-2 mt-0.5 opacity-50" />
                                        "{note.feedback}"
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pl-14 flex items-center justify-end">
                       <span className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center ${note.status === 'Closed' ? 'text-gray-500 bg-gray-100' : 'text-emerald-600 bg-emerald-50'}`}>
                          <CheckCircle2 size={12} className="mr-1" /> {note.status}
                       </span>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
