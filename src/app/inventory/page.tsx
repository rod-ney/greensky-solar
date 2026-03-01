"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowUpDown,
  Filter,
  Download,
  LayoutGrid,
  List,
  Warehouse,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Wrench,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import type { InventoryCategory, InventoryItem, InventoryMovement, InventoryMovementType } from "@/types";

type ViewMode = "grid" | "table";
type SortField = "name" | "quantity" | "unitPrice" | "status";
type SortOrder = "asc" | "desc";

const categoryLabels: Record<InventoryCategory, string> = {
  solar_panels: "Solar Panels",
  inverters: "Inverters",
  batteries: "Batteries",
  mounting: "Mounting Hardware",
  wiring: "Wiring & Cables",
  tools: "Tools & Equipment",
  accessories: "Accessories",
};

const categoryIcons: Record<InventoryCategory, string> = {
  solar_panels: "bg-green-50 text-green-600",
  inverters: "bg-blue-50 text-blue-600",
  batteries: "bg-purple-50 text-purple-600",
  mounting: "bg-orange-50 text-orange-600",
  wiring: "bg-amber-50 text-amber-600",
  tools: "bg-slate-100 text-slate-600",
  accessories: "bg-cyan-50 text-cyan-600",
};

const statusConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  in_stock: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bg: "bg-green-50 border-green-200",
    text: "text-green-700",
    label: "In Stock",
  },
  low_stock: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "Low Stock",
  },
  out_of_stock: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    label: "Out of Stock",
  },
};

function InventoryStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.in_stock;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

type PageTab = "items" | "movements";

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [view, setView] = useState<ViewMode>("table");
  const [pageTab, setPageTab] = useState<PageTab>("items");

  // Movement history state
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementTypeFilter, setMovementTypeFilter] = useState<InventoryMovementType | "all">("all");
  const [movementSearch, setMovementSearch] = useState("");

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const response = await fetch("/api/inventory", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as InventoryItem[];
        setInventoryItems(data);
      } catch {
        setInventoryItems([]);
      }
    };
    void loadInventory();
  }, []);

  const loadMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (movementTypeFilter !== "all") params.set("type", movementTypeFilter);
      const res = await fetch(`/api/inventory/movements?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: InventoryMovement[]; total: number };
      setMovements(data.items);
      setMovementsTotal(data.total);
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, [movementTypeFilter]);

  useEffect(() => {
    if (pageTab === "movements") {
      void loadMovements();
    }
  }, [pageTab, loadMovements]);

  const filteredMovements = useMemo(() => {
    if (!movementSearch.trim()) return movements;
    const q = movementSearch.toLowerCase();
    return movements.filter(
      (m) =>
        m.itemName.toLowerCase().includes(q) ||
        m.itemSku.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        (m.projectName ?? "").toLowerCase().includes(q)
    );
  }, [movements, movementSearch]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Add item form state
  const [addName, setAddName] = useState("");
  const [addSku, setAddSku] = useState("");
  const [addCategory, setAddCategory] = useState<InventoryCategory>("solar_panels");
  const [addQuantity, setAddQuantity] = useState(0);
  const [addMinStock, setAddMinStock] = useState(0);
  const [addUnit, setAddUnit] = useState("pcs");
  const [addUnitPrice, setAddUnitPrice] = useState(0);
  const [addLocation, setAddLocation] = useState("Warehouse A");
  const [addSupplier, setAddSupplier] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Stats
  const totalItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventoryItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const lowStockCount = inventoryItems.filter((i) => i.status === "low_stock").length;
  const outOfStockCount = inventoryItems.filter((i) => i.status === "out_of_stock").length;

  // Filter and sort
  const filteredItems = useMemo(() => {
    const items = inventoryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    items.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "unitPrice":
          comparison = a.unitPrice - b.unitPrice;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return items;
  }, [inventoryItems, search, categoryFilter, statusFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: inventoryItems.length };
    for (const cat of Object.keys(categoryLabels)) {
      counts[cat] = inventoryItems.filter((i) => i.category === cat).length;
    }
    return counts;
  }, [inventoryItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and manage solar equipment and supplies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download}>
            Export
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              setAddName("");
              setAddSku("");
              setAddCategory("solar_panels");
              setAddQuantity(0);
              setAddMinStock(0);
              setAddUnit("pcs");
              setAddUnitPrice(0);
              setAddLocation("Warehouse A");
              setAddSupplier("");
              setAddDescription("");
              setShowAddModal(true);
            }}
          >
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <Package className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Items</p>
              <p className="text-lg font-bold text-slate-900">{inventoryItems.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Warehouse className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Units</p>
              <p className="text-lg font-bold text-slate-900">
                {totalItems.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Low Stock Alerts</p>
              <p className="text-lg font-bold text-amber-600">{lowStockCount + outOfStockCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Inventory Value</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        <button
          onClick={() => setPageTab("items")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            pageTab === "items"
              ? "bg-brand text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Package className="h-4 w-4" />
          Inventory Items
        </button>
        <button
          onClick={() => setPageTab("movements")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            pageTab === "movements"
              ? "bg-brand text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <History className="h-4 w-4" />
          Movement History
        </button>
      </div>

      {pageTab === "items" && (<>
      {/* Filters Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as InventoryCategory | "all")}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Categories ({categoryCounts.all})</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({categoryCounts[key] ?? 0})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex gap-1.5">
            {(["all", "in_stock", "low_stock", "out_of_stock"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "in_stock"
                  ? "In Stock"
                  : s === "low_stock"
                  ? "Low Stock"
                  : "Out of Stock"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setView("grid")}
              className={`flex h-9 w-9 items-center justify-center rounded-l-lg ${
                view === "grid" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex h-9 w-9 items-center justify-center rounded-r-lg border-l border-slate-200 ${
                view === "table" ? "bg-brand text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {view === "table" ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Item
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                    SKU
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                    Category
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                    <button
                      onClick={() => toggleSort("quantity")}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Qty
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                    <button
                      onClick={() => toggleSort("unitPrice")}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Unit Price
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden xl:table-cell">
                    Location
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                    <button
                      onClick={() => toggleSort("status")}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      Status
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                      No items found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              categoryIcons[item.category]
                            }`}
                          >
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-500">{item.supplier}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-500 hidden md:table-cell">
                        {item.sku}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {categoryLabels[item.category]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-semibold ${
                              item.quantity === 0
                                ? "text-red-600"
                                : item.quantity <= item.minStock
                                ? "text-amber-600"
                                : "text-slate-900"
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-xs text-slate-400">{item.unit}</span>
                        </div>
                        {item.quantity > 0 && item.quantity <= item.minStock && (
                          <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{
                                width: `${Math.min(100, (item.quantity / item.minStock) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-700 hidden lg:table-cell">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 hidden xl:table-cell">
                        {item.location}
                      </td>
                      <td className="px-5 py-3.5">
                        <InventoryStatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDetailModal(true);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
              No items found matching your filters
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setShowDetailModal(true);
                }}
                className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-brand/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        categoryIcons[item.category]
                      }`}
                    >
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand truncate max-w-[200px]">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    </div>
                  </div>
                  <InventoryStatusBadge status={item.status} />
                </div>

                <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                  {item.description}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="text-center rounded-lg bg-slate-50 py-2">
                    <p
                      className={`text-lg font-bold ${
                        item.quantity === 0
                          ? "text-red-600"
                          : item.quantity <= item.minStock
                          ? "text-amber-600"
                          : "text-slate-900"
                      }`}
                    >
                      {item.quantity}
                    </p>
                    <p className="text-[10px] text-slate-500">{item.unit} in stock</p>
                  </div>
                  <div className="text-center rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{item.minStock}</p>
                    <p className="text-[10px] text-slate-500">Min. stock</p>
                  </div>
                  <div className="text-center rounded-lg bg-slate-50 py-2">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(item.unitPrice)}
                    </p>
                    <p className="text-[10px] text-slate-500">per {item.unit.replace(/s$/, "")}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{item.supplier}</span>
                  <span>{item.location}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      </>)}

      {/* Movement History Tab */}
      {pageTab === "movements" && (
        <div className="space-y-4">
          {/* Movement Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5">
              {(["all", "deduction", "return", "adjustment"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMovementTypeFilter(t)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    movementTypeFilter === t
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t === "all" && "All"}
                  {t === "deduction" && <><ArrowDownCircle className="h-3.5 w-3.5" /> Deductions</>}
                  {t === "return" && <><ArrowUpCircle className="h-3.5 w-3.5" /> Returns</>}
                  {t === "adjustment" && <><Wrench className="h-3.5 w-3.5" /> Adjustments</>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search movements..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="h-9 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          {/* Movement Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {movementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                <span className="ml-3 text-sm text-slate-500">Loading movements...</span>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-12">
                <History className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No movement history found.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Movements are recorded when inventory is allocated to or returned from projects.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Item</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">Qty</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Project</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Reason</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                              m.movementType === "deduction"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : m.movementType === "return"
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}
                          >
                            {m.movementType === "deduction" && <ArrowDownCircle className="h-3 w-3" />}
                            {m.movementType === "return" && <ArrowUpCircle className="h-3 w-3" />}
                            {m.movementType === "adjustment" && <Wrench className="h-3 w-3" />}
                            {m.movementType.charAt(0).toUpperCase() + m.movementType.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium text-slate-900">{m.itemName}</div>
                          <div className="text-xs text-slate-500 font-mono">{m.itemSku}</div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`text-sm font-semibold ${
                              m.quantity < 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {m.quantity > 0 ? "+" : ""}
                            {m.quantity}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {m.projectName ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500 max-w-[250px] truncate" title={m.reason}>
                          {m.reason}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {m.performedByName ?? <span className="text-slate-400">System</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredMovements.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                Showing {filteredMovements.length} of {movementsTotal} movements
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Detail / Edit Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
        title="Item Details"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  categoryIcons[selectedItem.category]
                }`}
              >
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedItem.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedItem.sku}
                </p>
              </div>
              <InventoryStatusBadge status={selectedItem.status} />
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {selectedItem.description}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Quantity</p>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    selectedItem.quantity === 0
                      ? "text-red-600"
                      : selectedItem.quantity <= selectedItem.minStock
                      ? "text-amber-600"
                      : "text-slate-900"
                  }`}
                >
                  {selectedItem.quantity}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    {selectedItem.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Min. Stock Level</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedItem.minStock}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    {selectedItem.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Unit Price</p>
                <p className="text-lg font-bold text-brand mt-0.5">
                  {formatCurrency(selectedItem.unitPrice)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total Value</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatCurrency(selectedItem.quantity * selectedItem.unitPrice)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Location</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {selectedItem.location}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Last Restocked</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {new Date(selectedItem.lastRestocked).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Supplier</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {selectedItem.supplier}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-1">Category</p>
              <span className="inline-flex rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {categoryLabels[selectedItem.category]}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedItem(null);
                }}
              >
                Close
              </Button>
              <Button size="sm" icon={Edit2}>
                Edit Item
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Item"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!addName.trim() || !addSku.trim()) {
              toast.error("Item name and SKU are required.");
              return;
            }
            setIsAdding(true);
            try {
              const response = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: addName.trim(),
                  sku: addSku.trim(),
                  category: addCategory,
                  quantity: addQuantity,
                  minStock: addMinStock,
                  unit: addUnit.trim() || "pcs",
                  unitPrice: addUnitPrice,
                  location: addLocation,
                  supplier: addSupplier.trim() || "Unknown",
                  description: addDescription.trim(),
                }),
              });
              const payload = (await response.json()) as InventoryItem | { error?: string };
              if (!response.ok) {
                toast.error(
                  "error" in payload && payload.error
                    ? payload.error
                    : "Failed to add item."
                );
                return;
              }
              const created = payload as InventoryItem;
              setInventoryItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
              setShowAddModal(false);
              toast.success("Item added successfully.");
            } catch {
              toast.error("Failed to add item.");
            } finally {
              setIsAdding(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="e.g. Monocrystalline Solar Panel 450W"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addSku}
                onChange={(e) => setAddSku(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="e.g. SP-MONO-450"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value as InventoryCategory)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min={0}
                value={addQuantity || ""}
                onChange={(e) => setAddQuantity(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Min. Stock
              </label>
              <input
                type="number"
                min={0}
                value={addMinStock || ""}
                onChange={(e) => setAddMinStock(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={addUnit}
                onChange={(e) => setAddUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="e.g. pcs, rolls, sets"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit Price (PHP)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={addUnitPrice || ""}
                onChange={(e) => setAddUnitPrice(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <select
                value={addLocation}
                onChange={(e) => setAddLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="Warehouse A">Warehouse A</option>
                <option value="Warehouse B">Warehouse B</option>
                <option value="Warehouse C">Warehouse C</option>
                <option value="Tool Room">Tool Room</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Supplier
            </label>
            <input
              type="text"
              value={addSupplier}
              onChange={(e) => setAddSupplier(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Supplier name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              placeholder="Brief description of the item..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAddModal(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
