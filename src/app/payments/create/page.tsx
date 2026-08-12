"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2,
  UploadCloud,
  X,
  Info,
  ChevronDown,
  Send
} from "lucide-react";
import Button from "@/components/ui/Button";

// Types
type Project = {
  id: string;
  name: string;
  client: string;
  clientEmail?: string;
  budget: number;
  userId?: string;
};

export default function CreateGeneralPaymentRequestPage() {
  const router = useRouter();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Derived Project
  const project = projects.find(p => p.id === selectedProjectId) || null;

  // Form State
  const [paymentType, setPaymentType] = useState("downpayment");
  const [paymentFor, setPaymentFor] = useState("Downpayment - 50% of Total Contract");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("2026-06-03");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  
  // Settings State
  const [methods, setMethods] = useState({
    gcash: true,
    maya: true,
    bank: true,
    paymongo: true,
    others: false
  });
  
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    inApp: true
  });

  // Derived Values
  const referenceNo = selectedProjectId ? `PAY-${selectedProjectId}` : `PAY-XXXX`;
  
  useEffect(() => {
    // Fetch all projects and users
    const fetchData = async () => {
      try {
        const [projRes, usersRes] = await Promise.all([
          fetch(`/api/projects`),
          fetch(`/api/users`)
        ]);
        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data.items || data || []);
        }
        if (usersRes.ok) {
          setUsers(await usersRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const clientUser = project && project.userId ? users.find(u => u.id === project.userId) : null;
  const clientEmail = clientUser?.email || project?.clientEmail || "Not available";
  const clientPhone = clientUser?.contactNumber || "Not available";

  // Update fields when project changes
  useEffect(() => {
    if (project) {
      const total = project.budget || 0;
      if (paymentType === 'downpayment' || paymentType === 'final') {
        setAmount((total * 0.5).toString());
      }
      
      setSubject(`Payment Request for ${project.id}`);
      setMessage(
        `Hi ${project.client.split(' ')[0] || 'Client'},\n\nA downpayment is required to confirm your project and schedule the installation.\n\nThank you for choosing Greensky Solar. We look forward to working with you!\n\nBest regards,\nGreensky Solar Team`
      );
    } else {
      setAmount("");
      setSubject("");
      setMessage("");
    }
  }, [project, paymentType]);

  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type);
    
    if (type === "downpayment") {
      setPaymentFor("Downpayment - 50% of Total Contract");
      if (project) setAmount((project.budget * 0.5).toString());
    } else if (type === "progress") {
      setPaymentFor("Progress Payment");
      setAmount("");
    } else if (type === "final") {
      setPaymentFor("Final Payment - Remaining Balance");
      if (project) setAmount((project.budget * 0.5).toString()); 
    } else {
      setPaymentFor("");
      setAmount("");
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 px-4 sm:px-6 lg:px-8 mt-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-brand transition-colors">Dashboard</Link>
            <span>›</span>
            <Link href="/payments" className="hover:text-brand transition-colors">Payments</Link>
            <span>›</span>
            <span className="font-medium text-brand">Create Request</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Create Payment Request</h1>
          <p className="mt-1 text-sm text-slate-500">Send a payment request to your client.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px]">
        {/* LEFT COLUMN: Form */}
        <div className="space-y-6">
          
          {/* Section 1: Select Project & Client */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-5">1. Select Project &amp; Client</h2>
            
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Project <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white p-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="" disabled>Select a project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} - {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    disabled 
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 p-2.5 pr-10 text-sm text-slate-700 outline-none"
                  >
                    <option>{project ? project.client : 'Select a project first...'}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Client Profile Card */}
              {project && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-sm">
                      {project.client.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{project.client}</p>
                      <p className="text-xs text-slate-500">{clientEmail}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{clientPhone}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-white">View Client Profile</Button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Payment Details */}
          <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-opacity ${!project ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-base font-bold text-slate-900 mb-5">2. Payment Details</h2>
            
            <div className="space-y-6">
              {/* Payment Type */}
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-700">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 pl-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${paymentType === 'downpayment' ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                      {paymentType === 'downpayment' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <input type="radio" className="hidden" checked={paymentType === 'downpayment'} onChange={() => handlePaymentTypeChange('downpayment')} />
                    <span className="text-sm text-slate-700">Downpayment (50%)</span>
                    <span className="rounded bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/50">Recommended</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${paymentType === 'progress' ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                      {paymentType === 'progress' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <input type="radio" className="hidden" checked={paymentType === 'progress'} onChange={() => handlePaymentTypeChange('progress')} />
                    <span className="text-sm text-slate-700">Progress Payment</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${paymentType === 'final' ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                      {paymentType === 'final' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <input type="radio" className="hidden" checked={paymentType === 'final'} onChange={() => handlePaymentTypeChange('final')} />
                    <span className="text-sm text-slate-700">Final Payment (Remaining Balance)</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${paymentType === 'other' ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                      {paymentType === 'other' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <input type="radio" className="hidden" checked={paymentType === 'other'} onChange={() => handlePaymentTypeChange('other')} />
                    <span className="text-sm text-slate-700">Other Amount</span>
                  </label>
                </div>
              </div>

              {/* Payment For */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Payment For <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    value={paymentFor}
                    onChange={(e) => setPaymentFor(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white p-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="Downpayment - 50% of Total Contract">Downpayment - 50% of Total Contract</option>
                    <option value="Progress Payment">Progress Payment</option>
                    <option value="Final Payment - Remaining Balance">Final Payment - Remaining Balance</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Amounts Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Total Contract Amount
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(project?.budget || 0)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Amount to Request <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₱</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-brand bg-emerald-50/20 p-2.5 pl-7 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
                    />
                  </div>
                </div>
              </div>
              
              {paymentType === 'downpayment' && (
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 border border-emerald-100/50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  This is 50% of the total contract amount.
                </div>
              )}

              {/* Due Date & Reference */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Reference No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-500 outline-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">This will be visible to the client.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Message */}
          <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-opacity ${!project ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-base font-bold text-slate-900 mb-5">3. Message to Client</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                />
                <p className="mt-2 text-[11px] text-slate-500">This message will be included in the email/notification sent to the client.</p>
              </div>
            </div>
          </div>

          {/* Section 4: Attachments */}
          <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-opacity ${!project ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-base font-bold text-slate-900 mb-5">4. Attachments (Optional)</h2>
            
            <div 
              className="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 transition-colors hover:border-brand/50 hover:bg-brand/5 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="mb-2 h-6 w-6 text-slate-400 group-hover:text-brand transition-colors" />
              <p className="text-sm font-medium text-slate-700">
                Drag and drop files here <span className="text-brand">or click to upload</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Accepted formats: PDF, JPG, PNG (Max size: 10MB)</p>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />
            </div>

            {/* Uploaded Files */}
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-50 border border-slate-100 text-slate-500">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900 line-clamp-1">{file.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-500 font-medium">{(file.size / 1024).toFixed(0)} KB</span>
                    <button 
                      className="text-slate-400 hover:text-red-500 transition-colors flex h-6 w-6 items-center justify-center rounded hover:bg-red-50"
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN: Preview & Settings */}
        <div className="space-y-6">
          
          {/* Live Preview Card */}
          <div className={`rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm transition-opacity ${!project ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Payment Request Preview</h3>
              <div className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            
            {/* The Actual Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
              {/* Logo (Mocked) */}
              <div className="mb-6 flex justify-center mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-slate-800 text-sm tracking-tight leading-none">GREENSKY</span>
                    <span className="font-semibold text-[8px] text-brand tracking-widest leading-none mt-0.5">SOLAR</span>
                  </div>
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <h4 className="text-base font-bold text-slate-900">Payment Request</h4>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider border border-emerald-200/50">Pending</span>
                </div>
                <p className="text-[11px] text-slate-500">Payment Request for {project?.id || 'XXXX-XXXX'}</p>
              </div>

              <div className="space-y-3.5 border-y border-slate-100 py-5 text-xs">
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <span className="text-slate-500">Client</span>
                  <span className="font-medium text-slate-900">{project?.client || '----'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <span className="text-slate-500">Project</span>
                  <span className="font-medium text-slate-900">{project?.name || '----'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <span className="text-slate-500">Payment Type</span>
                  <span className="font-medium text-slate-900">{paymentFor || 'Custom Amount'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-4 items-center pt-2">
                  <span className="text-slate-500">Amount Due</span>
                  <span className="text-xl font-bold text-brand tracking-tight">{formatCurrency(amount)}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-4 mt-2">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-medium text-slate-900">
                    {new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} 
                    <span className="ml-1 text-orange-500 font-semibold"> (14 days left)</span>
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <span className="text-slate-500">Reference No.</span>
                  <span className="font-medium text-slate-900">{referenceNo}</span>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Message</p>
                <div className="whitespace-pre-wrap text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  {message || 'Select a project to generate message...'}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-xs text-orange-800 border border-orange-100/50">
                <Info className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
                <p className="leading-snug">The client will receive this payment request via email and in their client portal.</p>
              </div>
            </div>
          </div>

          {/* Settings: Payment Methods */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Payment Methods to Display</h3>
            <p className="text-xs text-slate-500 mb-4">Select which payment methods will be shown to the client.</p>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${methods.gcash ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {methods.gcash && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={methods.gcash} onChange={(e) => setMethods({...methods, gcash: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">GCash</p>
                  <p className="text-[11px] text-slate-500">Show GCash QR and details</p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${methods.maya ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {methods.maya && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={methods.maya} onChange={(e) => setMethods({...methods, maya: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Maya</p>
                  <p className="text-[11px] text-slate-500">Show Maya QR and details</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${methods.bank ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {methods.bank && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={methods.bank} onChange={(e) => setMethods({...methods, bank: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Bank Transfer</p>
                  <p className="text-[11px] text-slate-500">Show bank account details</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${methods.paymongo ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {methods.paymongo && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={methods.paymongo} onChange={(e) => setMethods({...methods, paymongo: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Pay via PayMongo (Card / e-Wallet)</p>
                  <p className="text-[11px] text-slate-500">Allow client to pay securely online</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${methods.others ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {methods.others && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={methods.others} onChange={(e) => setMethods({...methods, others: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Others (Manual Payment)</p>
                  <p className="text-[11px] text-slate-500">Allow other payment instructions</p>
                </div>
              </label>
            </div>
          </div>

          {/* Settings: Send Notification Via */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Send Notification Via</h3>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${notifications.email ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {notifications.email && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={notifications.email} onChange={(e) => setNotifications({...notifications, email: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Email</p>
                  <p className="text-[11px] text-slate-500">Send via email to the client</p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${notifications.sms ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {notifications.sms && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={notifications.sms} onChange={(e) => setNotifications({...notifications, sms: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">SMS</p>
                  <p className="text-[11px] text-slate-500">Send via SMS to the client</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${notifications.inApp ? 'border-brand bg-brand' : 'border-slate-300 group-hover:border-brand/50'}`}>
                  {notifications.inApp && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={notifications.inApp} onChange={(e) => setNotifications({...notifications, inApp: e.target.checked})} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">In-App Notification</p>
                  <p className="text-[11px] text-slate-500">Send notification in client portal</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div 
        className="fixed bottom-0 right-0 z-40 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] flex items-center justify-between transition-all duration-200"
        style={{ left: 'var(--sidebar-width, 16rem)' }}
      >
        <Button variant="outline" className="hidden sm:flex bg-white hover:bg-slate-50" onClick={() => router.back()}>Cancel</Button>
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3">
          <Button variant="outline" className="border-brand/30 text-brand hover:bg-brand/5 bg-white" disabled={!project}>Save as Draft</Button>
          <Button variant="outline" className="border-brand/30 text-brand hover:bg-brand/5 bg-white hidden sm:flex" disabled={!project}>Preview</Button>
          <Button 
            className="bg-brand hover:bg-brand/90 flex items-center gap-2"
            disabled={!project}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send Payment Request</span>
            <span className="sm:hidden">Send Request</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
