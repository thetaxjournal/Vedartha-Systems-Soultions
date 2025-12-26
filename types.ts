
export enum UserRole {
  ADMIN = 'Admin',
  ACCOUNTANT = 'Accountant',
  BRANCH_MANAGER = 'Branch Manager',
  CLIENT = 'Client'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  allowedBranchIds: string[]; // 'ALL' or specific IDs
  displayName: string;
  clientId?: string; // Links a user to a specific client record
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  swiftCode?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: Address;
  contact: string;
  email: string;
  gstin: string;
  pan: string;
  logoUrl?: string;
  defaultTaxRate: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  bankDetails: BankDetails;
  portalUsername?: string; // New: Branch Portal Login
  portalPassword?: string; // New: Branch Portal Password
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  billingAddress: Address;
  shippingAddress: Address;
  gstin: string;
  branchIds: string[];
  status: 'Active' | 'Inactive';
  portalAccess?: boolean;
  portalPassword?: string; // Stored for the simulation of "Client ID" login
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  taxPercent: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  branchId: string;
  branchName: string;
  clientId: string;
  clientName: string;
  clientGstin: string;
  kindAttn: string;
  placeOfSupply: string; // New: To determine IGST vs CGST/SGST persistence
  items: InvoiceItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Posted' | 'Paid' | 'Cancelled';
  archived?: boolean; // New: For Financial Year Close
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  date: string;
  method: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Online Gateway';
  reference: string;
  archived?: boolean; // New: For Financial Year Close
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Sales' | 'Purchase' | 'Receipt' | 'Payment';
  amount: number;
  description: string;
  referenceId: string;
  branchId: string;
}

export interface AppNotification {
  id: string;
  ticketNumber?: string; // Added for Ticket System
  date: string;
  branchId: string; // Used to route notification to specific branch manager
  clientId: string;
  clientName: string;
  subject: string;
  message: string;
  status: 'Open' | 'Closed' | 'Revoked'; // Simplified Workflow
  rating?: number; // 1-5 Stars
  feedback?: string; // Client feedback text
  adminResponse?: string; // New: Admin Reply
  responseDate?: string; // New: Date of reply
  archived?: boolean; // New: For Financial Year Close
}

export type Module = 'Dashboard' | 'Invoices' | 'Payments' | 'Clients' | 'Branches' | 'Accounts' | 'Settings' | 'Scanner' | 'Notifications';
