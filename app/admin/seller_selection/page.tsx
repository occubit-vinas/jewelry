'use client'

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  productId: string;
  category: string;
  images: string[];
  metalWeight: number;
}

interface Seller {
  _id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  allowedProducts: Product[] | string[]; // references
  createdAt: string;
}

export default function SellerSelectionPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocation Modal State
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Feedback states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [savingProducts, setSavingProducts] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Load sellers and products on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [sellersRes, productsRes] = await Promise.all([
        fetch("/api/admin/sellers"),
        fetch("/api/products")
      ]);
      const sellersData = await sellersRes.json();
      const productsData = await productsRes.json();

      if (Array.isArray(sellersData)) {
        setSellers(sellersData);
      } else if (sellersData && sellersData.error) {
        setMessage({ text: sellersData.error, type: "error" });
        setSellers([]);
      } else {
        setSellers([]);
      }

      if (Array.isArray(productsData)) {
        setProducts(productsData);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setMessage({ text: "Failed to connect to database.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Update seller status (Approve / Reject)
  const handleStatusChange = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      setActionLoadingId(id);
      setMessage(null);
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();

      if (result.success) {
        setSellers((prev) =>
          prev.map((s) => (s._id === id ? { ...s, status: newStatus } : s))
        );
        setMessage({ text: `Seller registration ${newStatus} successfully!`, type: "success" });
      } else {
        throw new Error(result.error || "Failed to update status");
      }
    } catch (err) {
      setMessage({ text: `Error updating status: ${String(err)}`, type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete seller account
  const handleDeleteSeller = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete seller "${name}"?`)) return;
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSellers((prev) => prev.filter((s) => s._id !== id));
        setMessage({ text: "Seller deleted successfully.", type: "success" });
      } else {
        throw new Error(data.error || "Delete failed");
      }
    } catch (err) {
      setMessage({ text: `Delete error: ${String(err)}`, type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Allocation Modal
  const openAllocationModal = (seller: Seller) => {
    setSelectedSeller(seller);
    // Initialize checked ids
    const activeIds = seller.allowedProducts?.map((p: any) => typeof p === 'object' ? p._id : p) || [];
    setSelectedProductIds(activeIds);
    setSearchQuery("");
    setSelectedCategory("all");
  };

  // Toggle product selection checkbox
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Save product allocations to database
  const handleSaveAllocations = async () => {
    if (!selectedSeller) return;
    try {
      setSavingProducts(true);
      setMessage(null);

      const res = await fetch(`/api/admin/sellers/${selectedSeller._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedProducts: selectedProductIds }),
      });

      const result = await res.json();
      if (result.success) {
        // Sync parent listing state
        setSellers((prev) =>
          prev.map((s) => (s._id === selectedSeller._id ? { ...s, allowedProducts: result.data.allowedProducts } : s))
        );
        setMessage({ text: `Product allocations updated for ${selectedSeller.name}!`, type: "success" });
        setSelectedSeller(null);
      } else {
        throw new Error(result.error || "Failed to save allocations");
      }
    } catch (err) {
      setMessage({ text: `Save error: ${String(err)}`, type: "error" });
    } finally {
      setSavingProducts(false);
    }
  };

  // Filter products for display in the modal
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.productId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || prod.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categoriesList = Array.from(new Set(products.map((p) => p.category)));

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Loading Registered Sellers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Banner Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-amber-500 transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
              Seller Selection Console
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Approve or reject seller registrations and allocate products catalog access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              message.type === "success" 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
            }`}>
              {message.text}
            </div>
          )}
          <Link
            href="/admin/products"
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-855 text-white rounded-lg hover:bg-amber-500 hover:text-white transition-all font-semibold shadow-sm cursor-pointer"
          >
            Manage Catalog
          </Link>
        </div>
      </header>

      {/* Main Dash */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {sellers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm gap-4 text-center">
            <svg className="h-16 w-16 text-zinc-300 dark:text-zinc-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-bold">No Sellers Registered</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Once seller partners sign up via the seller portal, their requests will appear here for verification.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col gap-4">
            <h2 className="text-sm font-bold text-amber-600 dark:text-amber-500 border-b border-zinc-100 dark:border-zinc-850 pb-3">
              Registered Sellers Directory
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-250 dark:divide-zinc-800 text-left text-xs font-medium">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="py-3.5 px-4">Name / ID</th>
                    <th className="py-3.5 px-4">Email Address</th>
                    <th className="py-3.5 px-4">Registration Date</th>
                    <th className="py-3.5 px-4">Approval Status</th>
                    <th className="py-3.5 px-4">Allocated Catalog</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                  {sellers.map((seller) => {
                    const isPending = seller.status === "pending";
                    const isApproved = seller.status === "approved";
                    const isRejected = seller.status === "rejected";
                    const allocatedCount = seller.allowedProducts?.length || 0;

                    return (
                      <tr key={seller._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                        {/* Name */}
                        <td className="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                          {seller.name}
                        </td>
                        
                        {/* Email */}
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                          {seller.email}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-500 font-mono">
                          {new Date(seller.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>

                        {/* Status badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize leading-tight ${
                            isApproved 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                              : isRejected 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                              : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          }`}>
                            {seller.status}
                          </span>
                        </td>

                        {/* Allowed count */}
                        <td className="py-3.5 px-4">
                          {isApproved ? (
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {allocatedCount} {allocatedCount === 1 ? "Product" : "Products"} Allowed
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Not Approved</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2.5">
                            
                            {/* Status controls */}
                            {(isPending || isRejected) && (
                              <button
                                onClick={() => handleStatusChange(seller._id, "approved")}
                                disabled={actionLoadingId === seller._id}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 rounded-md font-bold transition-colors cursor-pointer text-[10px]"
                              >
                                Approve
                              </button>
                            )}

                            {(isPending || isApproved) && (
                              <button
                                onClick={() => handleStatusChange(seller._id, "rejected")}
                                disabled={actionLoadingId === seller._id}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-500 border border-rose-500/20 rounded-md font-bold transition-colors cursor-pointer text-[10px]"
                              >
                                Reject
                              </button>
                            )}

                            {/* Product allocation trigger */}
                            {isApproved && (
                              <button
                                onClick={() => openAllocationModal(seller)}
                                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-500 border border-amber-500/20 rounded-md font-bold transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Allocate Products
                              </button>
                            )}

                            {/* Delete seller account */}
                            <button
                              onClick={() => handleDeleteSeller(seller._id, seller.name)}
                              className="text-zinc-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer"
                              title="Delete seller account"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* OVERLAY MODAL FOR ALLOCATING PRODUCTS */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="font-extrabold text-base text-amber-600 dark:text-amber-500">
                  Allocate Catalog Access
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Select which products {selectedSeller.name} is authorized to sell</p>
              </div>
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filters Bar */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-150 dark:border-zinc-850 flex gap-4 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                ))}
              </select>

              <div className="flex gap-2 items-center text-[10px] font-bold text-zinc-500">
                <button
                  type="button"
                  onClick={() => setSelectedProductIds(products.map((p) => p._id))}
                  className="hover:text-amber-500 transition-colors"
                >
                  Select All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="hover:text-amber-500 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Modal Products Checklist Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 italic">
                  No products match your search filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map((prod) => {
                    const isChecked = selectedProductIds.includes(prod._id);
                    const hasImage = prod.images && prod.images.length > 0;
                    
                    return (
                      <div 
                        key={prod._id}
                        onClick={() => toggleProductSelection(prod._id)}
                        className={`p-3 border rounded-xl flex gap-3 items-center cursor-pointer transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 ${
                          isChecked 
                            ? "border-amber-500 bg-amber-500/[0.02]" 
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className={`w-4.5 h-4.5 border rounded flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-300 dark:border-zinc-700"
                        }`}>
                          {isChecked && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Product Thumbnail */}
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          {hasImage ? (
                            <img src={prod.images[0]} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="h-5 w-5 text-zinc-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>

                        {/* Product details info */}
                        <div className="flex-1 min-w-0">
                          <span className="block text-[8px] font-mono text-zinc-400 font-bold uppercase">SKU: {prod.productId}</span>
                          <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate leading-tight">{prod.name}</h4>
                          <div className="flex gap-2 items-center text-[9px] text-zinc-500 mt-0.5 capitalize font-semibold">
                            <span>{prod.category}</span>
                            <span>•</span>
                            <span>{prod.metalWeight}g</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setSelectedSeller(null)}
                className="px-4 py-2 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAllocations}
                disabled={savingProducts}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingProducts ? "Saving Allocations..." : "Save Assignments"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
