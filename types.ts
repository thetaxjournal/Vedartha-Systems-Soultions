
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
  items: InvoiceItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Posted' | 'Paid' | 'Cancelled';
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

export type Module = 'Dashboard' | 'Invoices' | 'Payments' | 'Clients' | 'Branches' | 'Accounts' | 'Settings' | 'Scanner';
