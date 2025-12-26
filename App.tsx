
import React, { useState, useEffect, useMemo } from 'react';
import { Module, Branch, Client, Invoice, Payment, UserProfile, AppNotification, UserRole } from './types';
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
import Notifications from './modules/Notifications';
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
  where,
  orderBy,
  getDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Store extended user data (role, branches)
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<Module>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State managed by Firestore listeners
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [showCreation, setShowCreation] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Auth Listener
  useEffect(() => {
    // Standard Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Only set user if it's not a synthetic client login (which is handled manually in Login.tsx)
      if (currentUser) {
        setUser(currentUser);
        // Fetch User Profile Role
        try {
           // In a real app, you would fetch this from 'users' collection using currentUser.uid
           // For this demo, if email is admin@vedartha.com, grant ADMIN, else BRANCH_MANAGER
           // Assuming we might have stored it in Firestore 'users' collection:
           const userQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
           // For simplicity in this demo structure without full user management implementation:
           const isAdmin = currentUser.email?.includes('admin');
           const mockProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              role: isAdmin ? UserRole.ADMIN : UserRole.BRANCH_MANAGER,
              allowedBranchIds: isAdmin ? [] : ['B001'] // Mock: Admin sees all, Manager sees B001
           };
           setUserProfile(mockProfile);
        } catch (e) {
           console.error("Error fetching user profile", e);
        }
      } else if (!user?.isClient) {
        setUser(null);
        setUserProfile(null);
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
      const sorted = snapshot.docs.map(doc => doc.data() as Invoice).sort((a,b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA; // Newest date first
        return b.id.localeCompare(a.id); // Tie-breaker: Newer ID first
      });
      setInvoices(sorted);
    });

    // Payments Listener
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const sorted = snapshot.docs.map(doc => doc.data() as Payment).sort((a,b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id.localeCompare(a.id);
      });
      setPayments(sorted);
    });
    
    // Notifications Listener (New)
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const sorted = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AppNotification)).sort((a,b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Date includes time, usually sufficient
        });
        setNotifications(sorted);
    });

    return () => {
      unsubBranches();
      unsubClients();
      unsubInvoices();
      unsubPayments();
      unsubNotifications();
    };
  }, [user]);

  const handleLogin = (userObj: any) => {
    setUser(userObj);
    // For Synthetic Client Login
    if (userObj.isClient) {
        setUserProfile({
            uid: userObj.uid,
            email: userObj.email,
            displayName: userObj.displayName,
            role: UserRole.CLIENT,
            allowedBranchIds: [],
            clientId: userObj.clientId
        });
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  // Firestore Updates
  const handleUpdateClients = async (newClients: Client[]) => {
    newClients.forEach(async (c) => {
      await setDoc(doc(db, 'clients', c.id), c);
    });
  };
  
  // NEW: Handle Client Deletion
  const handleDeleteClient = async (clientId: string) => {
      if(confirm('Are you sure you want to permanently delete this client? This cannot be undone.')) {
          await deleteDoc(doc(db, 'clients', clientId));
      }
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
  
  // Send Notification to Admin/Branch (Raise Ticket)
  const handleClientMessage = async (subject: string, message: string, generatedTicketNumber: string) => {
      if(!user?.isClient) return;
      
      // Find Client Branch ID to route notification
      const currentClient = clients.find(c => c.id === user.clientId);
      const targetBranchId = currentClient?.branchIds[0] || 'B001'; // Default or first branch

      const newNotification: Omit<AppNotification, 'id'> = {
          date: new Date().toISOString(),
          clientId: user.clientId,
          clientName: user.displayName,
          branchId: targetBranchId,
          ticketNumber: generatedTicketNumber,
          subject,
          message,
          status: 'Open',
          archived: false
      };
      
      await addDoc(collection(db, 'notifications'), newNotification);
  };

  // Close Ticket (Admin)
  const handleCloseTicket = async (ticketId: string) => {
      await updateDoc(doc(db, 'notifications', ticketId), { status: 'Closed' });
  };

  // Reply to Ticket (Admin)
  const handleReplyTicket = async (ticketId: string, response: string) => {
      await updateDoc(doc(db, 'notifications', ticketId), { 
          adminResponse: response,
          responseDate: new Date().toISOString(),
          status: 'Closed' // Automatically close on reply to streamline workflow
      });
  };

  // Revoke Ticket (Client)
  const handleRevokeTicket = async (ticketId: string) => {
      if (confirm('Are you sure you want to revoke this ticket? This action cannot be undone.')) {
          await updateDoc(doc(db, 'notifications', ticketId), { status: 'Revoked' }); 
      }
  };

  // Submit Feedback (Client)
  const handleTicketFeedback = async (ticketId: string, rating: number, feedback: string) => {
      await updateDoc(doc(db, 'notifications', ticketId), { 
          rating,
          feedback 
      });
  };

  // --- PURGE SYSTEM LOGIC ---
  const handlePurgeSystem = async () => {
      if (!confirm("CRITICAL WARNING:\n\nThis will PERMANENTLY DELETE all:\n- Invoices\n- Clients\n- Payments\n- Support Tickets\n\nThis action cannot be undone. Are you sure you want to proceed?")) {
          return;
      }
      
      if (!confirm("Final Confirmation: Do you really want to wipe the database?")) return;

      setLoading(true);
      try {
          const collections = ['invoices', 'clients', 'payments', 'notifications'];
          
          for (const colName of collections) {
              const q = query(collection(db, colName));
              const snapshot = await getDocs(q);
              const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
          }
          alert("System Purge Complete. All records have been deleted.");
      } catch (error) {
          console.error("Purge failed", error);
          alert("System Purge Failed. Please check console for details.");
      } finally {
          setLoading(false);
      }
  };

  // --- RESTORE SYSTEM LOGIC ---
  const handleRestoreSystem = async (backupData: any) => {
    if (!confirm("WARNING: You are about to overwrite/merge the current database with this backup.\n\nExisting records with matching IDs will be updated. New records will be added.\n\nAre you sure you want to proceed?")) return;
    
    setLoading(true);
    try {
      const collections = [
        { key: 'branches', dbName: 'branches' },
        { key: 'clients', dbName: 'clients' },
        { key: 'invoices', dbName: 'invoices' },
        { key: 'payments', dbName: 'payments' },
        { key: 'notifications', dbName: 'notifications' }
      ];

      for (const col of collections) {
        if (Array.isArray(backupData[col.key])) {
          for (const item of backupData[col.key]) {
            // Ensure ID exists, if not generate one or skip? Assuming valid backup has IDs.
            if (item.id) {
               await setDoc(doc(db, col.dbName, item.id), item);
            }
          }
        }
      }
      
      alert("System Restore Complete. Database has been updated from the backup file.");
    } catch (e) {
      console.error(e);
      alert("Error restoring data. Please ensure the file is a valid system backup.");
    } finally {
      setLoading(false);
    }
  };

  // --- CLOSE FINANCIAL YEAR LOGIC (UPDATED: ARCHIVE ALL & CHUNK) ---
  const handleCloseFinancialYear = async () => {
    const confirmMsg = `CLOSE FINANCIAL YEAR & ARCHIVE DATA?\n\nThis action will:\n1. Move all current Invoices, Payments, and Tickets to the 'Archived' state.\n2. Your Admin Dashboard will be reset to ZERO.\n3. Clients will STILL see their history in the Client Portal.\n\nSAFE DATA:\n- Client Master Records will NOT be deleted.\n- Branch Configurations will NOT be deleted.\n\nAre you sure you want to proceed?`;
    
    if (!confirm(confirmMsg)) return;
    if (!confirm("Double Check: Have you downloaded your Backup/Reports?")) return;

    setLoading(true);
    try {
        const collectionsToArchive = ['invoices', 'payments', 'notifications'];
        let batch = writeBatch(db);
        let opCount = 0;
        let totalArchived = 0;

        for (const colName of collectionsToArchive) {
             // Retrieve ALL documents to ensure even legacy ones without 'archived' field are processed
             const snapshot = await getDocs(collection(db, colName));
             
             snapshot.docs.forEach((docSnap) => {
                 const data = docSnap.data();
                 // Archive if it's not already archived (checks for false or undefined)
                 if (data.archived !== true) {
                     batch.update(docSnap.ref, { archived: true });
                     opCount++;
                     totalArchived++;
                 }

                 // Firestore Batch Limit is 500, chunk at 450 for safety
                 if (opCount >= 450) {
                     batch.commit();
                     batch = writeBatch(db); // Start new batch
                     opCount = 0;
                 }
             });
        }
        
        if (opCount > 0) {
            await batch.commit();
        }
        
        alert(`Financial Year Closed Successfully.\n${totalArchived} records have been archived. Dashboard is now Zero.`);
    } catch(e) {
        console.error(e);
        alert("Error closing financial year. Please check console for details.");
    } finally {
        setLoading(false);
    }
  };

  // --- FILTERED DATA FOR ADMIN (Exclude Archived) ---
  const activeInvoices = useMemo(() => invoices.filter(i => !i.archived), [invoices]);
  const activePayments = useMemo(() => payments.filter(p => !p.archived), [payments]);
  const activeNotifications = useMemo(() => notifications.filter(n => !n.archived), [notifications]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-bold animate-pulse">Loading Cloud Resources...</div>;

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
         invoices={invoices} // Pass ALL invoices (history preserved)
         payments={payments} // Pass ALL payments (history preserved)
         branches={branches}
         notifications={notifications.filter(n => n.clientId === user.clientId)} // Pass all tickets for client
         onLogout={handleLogout}
         onSendMessage={handleClientMessage}
         onFeedback={handleTicketFeedback}
         onRevokeTicket={handleRevokeTicket}
      />
    );
  }
  // -----------------------------

  // --- FILTER DATA FOR BRANCH MANAGERS (Admin Side) ---
  const isBranchManager = userProfile?.role === UserRole.BRANCH_MANAGER;
  const allowedBranches = isBranchManager && userProfile?.allowedBranchIds 
    ? branches.filter(b => userProfile.allowedBranchIds.includes(b.id)) 
    : branches;

  // Filter Notifications for Branch Manager
  const filteredNotifications = isBranchManager 
     ? activeNotifications.filter(n => userProfile?.allowedBranchIds.includes(n.branchId))
     : activeNotifications;
  // ---------------------------------------

  const renderModule = () => {
    switch (activeModule) {
      case 'Dashboard':
        return (
          <Dashboard 
            invoices={activeInvoices} // Admin sees only active year
            clients={clients} 
            branches={allowedBranches} 
            payments={activePayments}
            onRecordPayment={handleRecordPayment}
          />
        );
      case 'Notifications':
        return (
            <Notifications 
                notifications={filteredNotifications} 
                onCloseTicket={handleCloseTicket}
                onReplyTicket={handleReplyTicket}
            />
        );
      case 'Invoices':
        if (showCreation) {
          return (
            <InvoiceCreation 
              branches={allowedBranches} 
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
            invoices={activeInvoices} // Admin sees only active year
            clients={clients}
            branches={allowedBranches}
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
            invoices={activeInvoices} 
            payments={activePayments} 
            branches={allowedBranches}
            onRecordPayment={handleRecordPayment} 
          />
        );
      case 'Clients':
        return <Clients clients={clients} setClients={handleUpdateClients} branches={allowedBranches} onDeleteClient={handleDeleteClient} />;
      case 'Branches':
        // Only Admin can access, Sidebar should hide it but double check
        if (isBranchManager) return <div>Access Denied</div>;
        return <Branches branches={branches} setBranches={handleUpdateBranches} />;
      case 'Accounts':
        return <Accounts invoices={activeInvoices} payments={activePayments} clients={clients} />;
      case 'Scanner':
        return <Scanner invoices={activeInvoices} payments={activePayments} />;
      case 'Settings':
        if (isBranchManager) return <div>Access Denied</div>;
        return (
          <Settings 
            state={{ invoices, clients, branches, payments, notifications }} // Backup everything, including archived
            onAddUser={handleAddUser}
            onPurgeData={handlePurgeSystem}
            onCloseFinancialYear={handleCloseFinancialYear}
            onRestoreData={handleRestoreSystem} 
          />
        );
      default:
        return (
          <Dashboard 
            invoices={activeInvoices} 
            clients={clients} 
            branches={allowedBranches} 
            payments={activePayments}
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
          setIsSidebarOpen(false); // Close sidebar on mobile when module changes
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={userProfile?.role}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          branches={allowedBranches}
          activeBranchId={activeBranchId}
          onBranchChange={setActiveBranchId}
          title={activeModule === 'Invoices' ? (showCreation ? (editingInvoice ? 'Edit Document' : 'Create Invoice') : 'Invoice Dashboard') : activeModule}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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
