
import React, { useState, useEffect } from 'react';
import { Module, Branch, Client, Invoice, Payment, UserProfile } from './types';
import { INITIAL_BRANCHES, INITIAL_CLIENTS } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import InvoiceList from './modules/InvoiceList';
import InvoiceCreation from './modules/InvoiceCreation';
import Payments from './modules/Payments';
import Clients from './modules/Clients';
import Branches from './modules/Branches';
import Accounts from './modules/Accounts';
import Settings from './modules/Settings';
import Scanner from './modules/Scanner';
import Login from './components/Login';
import ClientPortal from './modules/ClientPortal';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  setDoc,
  query,
  where
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<Module>('Dashboard');
  
  // State managed by Firestore listeners
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [showCreation, setShowCreation] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Auth Listener
  useEffect(() => {
    // Standard Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Only set user if it's not a synthetic client login (which is handled manually in Login.tsx)
      if (currentUser) {
        setUser(currentUser);
      } else if (!user?.isClient) {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // Remove user dependency to avoid loop, we handle it logically

  // Data Listeners (Firestore)
  useEffect(() => {
    if (!user) return;

    // Branches Listener
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Branch);
      if (data.length === 0) {
        INITIAL_BRANCHES.forEach(async (b) => {
          await setDoc(doc(db, 'branches', b.id), b);
        });
      } else {
        setBranches(data);
        if (!activeBranchId && data.length > 0) setActiveBranchId(data[0].id);
      }
    });

    // Clients Listener
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => doc.data() as Client));
    });

    // Invoices Listener
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const sorted = snapshot.docs.map(doc => doc.data() as Invoice).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setInvoices(sorted);
    });

    // Payments Listener
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const sorted = snapshot.docs.map(doc => doc.data() as Payment).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(sorted);
    });

    return () => {
      unsubBranches();
      unsubClients();
      unsubInvoices();
      unsubPayments();
    };
  }, [user]);

  const handleLogin = (userObj: any) => {
    setUser(userObj);
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
  };

  // Firestore Updates
  const handleUpdateClients = async (newClients: Client[]) => {
    newClients.forEach(async (c) => {
      await setDoc(doc(db, 'clients', c.id), c);
    });
  };

  const handleUpdateBranches = (newBranches: Branch[]) => {
    newBranches.forEach(async (b) => {
      await setDoc(doc(db, 'branches', b.id), b);
    });
  };

  const handlePostInvoice = async (invoice: Invoice) => {
    await setDoc(doc(db, 'invoices', invoice.id), invoice);
    const branch = branches.find(b => b.id === invoice.branchId);
    if (branch && !editingInvoice) {
      await updateDoc(doc(db, 'branches', branch.id), {
        nextInvoiceNumber: branch.nextInvoiceNumber + 1
      });
    }
    setEditingInvoice(null);
    setShowCreation(false);
  };

  const handleRecordPayment = async (payment: Payment) => {
    await setDoc(doc(db, 'payments', payment.id), payment);
    await updateDoc(doc(db, 'invoices', payment.invoiceId), {
      status: 'Paid'
    });
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowCreation(true);
  };

  const handleRevoke = async (id: string) => {
    if (confirm("Are you sure you want to revoke this document? It will be marked as Cancelled.")) {
      await updateDoc(doc(db, 'invoices', id), { status: 'Cancelled' });
    }
  };

  const handleAddUser = async (userProfile: Omit<UserProfile, 'uid'>) => {
    await addDoc(collection(db, 'users'), userProfile);
  };

  // NEW: Handle online payment from Client Portal
  const handleClientOnlinePayment = async (invoiceId: string, amount: number): Promise<Payment | undefined> => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return undefined;

    const newPayment: Payment = {
      id: `RCPT-${Date.now().toString().slice(-8)}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      method: 'Online Gateway',
      reference: `GATEWAY-${Date.now()}`
    };

    // Trigger standard payment recording logic which updates Invoice Status and adds Receipt
    await handleRecordPayment(newPayment);
    return newPayment;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-blue-600">Loading Cloud Resources...</div>;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // --- CLIENT PORTAL ROUTING ---
  if (user.isClient) {
    const currentClient = clients.find(c => c.id === user.clientId);
    return (
      <ClientPortal 
         user={user}
         clientData={currentClient}
         invoices={invoices}
         payments={payments}
         branches={branches}
         onPayInvoice={handleClientOnlinePayment}
         onLogout={handleLogout}
      />
    );
  }
  // -----------------------------

  const renderModule = () => {
    switch (activeModule) {
      case 'Dashboard':
        return (
          <Dashboard 
            invoices={invoices} 
            clients={clients} 
            branches={branches} 
            payments={payments}
            onRecordPayment={handleRecordPayment}
          />
        );
      case 'Invoices':
        if (showCreation) {
          return (
            <InvoiceCreation 
              branches={branches} 
              activeBranchId={activeBranchId} 
              clients={clients} 
              initialInvoice={editingInvoice || undefined}
              onPost={handlePostInvoice}
              onCancel={() => {
                setShowCreation(false);
                setEditingInvoice(null);
              }}
            />
          );
        }
        return (
          <InvoiceList 
            invoices={invoices} 
            clients={clients}
            branches={branches}
            onNewInvoice={() => {
              setEditingInvoice(null);
              setShowCreation(true);
            }} 
            onEdit={handleEdit}
            onRevoke={handleRevoke}
          />
        );
      case 'Payments':
        return (
          <Payments 
            invoices={invoices} 
            payments={payments} 
            branches={branches}
            onRecordPayment={handleRecordPayment} 
          />
        );
      case 'Clients':
        return <Clients clients={clients} setClients={handleUpdateClients} branches={branches} />;
      case 'Branches':
        return <Branches branches={branches} setBranches={handleUpdateBranches} />;
      case 'Accounts':
        return <Accounts invoices={invoices} />;
      case 'Scanner':
        return <Scanner invoices={invoices} payments={payments} />;
      case 'Settings':
        return (
          <Settings 
            state={{ invoices, clients, branches, payments }} 
            onAddUser={handleAddUser}
          />
        );
      default:
        return (
          <Dashboard 
            invoices={invoices} 
            clients={clients} 
            branches={branches} 
            payments={payments}
            onRecordPayment={handleRecordPayment}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      <Sidebar 
        activeModule={activeModule} 
        onModuleChange={(m) => {
          setActiveModule(m);
          setShowCreation(false);
          setEditingInvoice(null);
        }} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchChange={setActiveBranchId}
          title={activeModule === 'Invoices' ? (showCreation ? (editingInvoice ? 'Edit Document' : 'Create Invoice') : 'Invoice Dashboard') : activeModule}
          onLogout={handleLogout}
        />
        
        <main className={`flex-1 overflow-y-auto ${(activeModule === 'Invoices' && showCreation) ? 'p-0' : 'p-8'}`}>
          <div className={(activeModule === 'Invoices' && showCreation) ? 'h-full' : 'max-w-7xl mx-auto'}>
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
