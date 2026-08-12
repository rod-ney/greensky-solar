"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, Download, MoreHorizontal, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";

// Mock data
const mockPayments = [
  {
    id: "PAY-2025-00118",
    project: "PRJ-2025-00118",
    projectName: "Residential Solar Installation",
    client: "Juan Dela Cruz",
    type: "Downpayment (50%)",
    amount: 121800,
    dueDate: "2026-06-03",
    status: "pending",
  },
  {
    id: "PAY-2025-00117",
    project: "PRJ-2025-00117",
    projectName: "Commercial Solar Farm",
    client: "Maria Santos",
    type: "Progress Payment",
    amount: 450000,
    dueDate: "2026-05-15",
    status: "paid",
  },
  {
    id: "PAY-2025-00116",
    project: "PRJ-2025-00116",
    projectName: "Hybrid System Setup",
    client: "Pedro Garcia",
    type: "Final Payment",
    amount: 85000,
    dueDate: "2026-05-01",
    status: "overdue",
  }
];

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 mt-4">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and track client payment requests across all projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={Download} className="bg-white">Export</Button>
          <Link href="/payments/create">
            <Button className="bg-brand hover:bg-brand/90" icon={Plus}>Create Request</Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference no, client, or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
            />
          </div>
          <Button variant="outline" icon={Filter} className="shrink-0 bg-white">Filters</Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Sort by:</span>
          <select className="rounded border-none bg-transparent py-1 pl-1 pr-6 text-slate-900 font-medium outline-none focus:ring-0 cursor-pointer">
            <option>Newest First</option>
            <option>Due Date</option>
            <option>Amount (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 font-semibold text-slate-900">Reference No.</th>
                <th className="px-6 py-4 font-semibold text-slate-900">Client / Project</th>
                <th className="px-6 py-4 font-semibold text-slate-900">Payment Type</th>
                <th className="px-6 py-4 font-semibold text-slate-900 text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-slate-900">Due Date</th>
                <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-slate-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-slate-900">{payment.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{payment.client}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <span className="font-mono text-slate-400">{payment.project.slice(0, 8).toUpperCase()}</span>
                      <span className="truncate max-w-[150px]">{payment.projectName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{payment.type}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(payment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                      <button className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
