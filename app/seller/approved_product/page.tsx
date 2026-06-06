'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CustomDuty {
  country: string;
  dutyPercentage: number;
}

interface Metal {
  name: string;
  basePricePer10g: number;
}

interface PricingConfig {
  metals: Metal[];
  diamond: {
    basePricePerCarat: number;
  };
  customDuties: CustomDuty[];
}

interface ProductVariant {
  sku: string;
  metalName: string;
  purity: string;
  diamondType: string;
  diamondShape: string;
  diamondColor: string;
  diamondClarity: string;
  priceChange: number;
  images: string[];
  finalPrice: number; // Base cost
}

interface Product {
  _id: string;
  name: string;
  productId: string;
  description: string;
  category: string;
  images: string[];
  metalWeight: number;
  diamondWeight: number;
  profitPercentage: number;
  variants: ProductVariant[];
}

export default function SellerApprovedProductsPage() {
  const router = useRouter();

  // Session state
  const [sellerEmail, setSellerEmail] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Data states
  const [approvedProducts, setApprovedProducts] = useState<Product[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  // Custom Duty select state
  const [selectedCountry, setSelectedCountry] = useState<CustomDuty | null>(null);

  // Drilldown Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Check login and fetch data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionStr = localStorage.getItem("sellerSession");
      if (!sessionStr) {
        setIsLoggedOut(true);
        setLoading(false);
      } else {
        const session = JSON.parse(sessionStr);
        setSellerEmail(session.email);
        setSellerName(session.name);
        fetchCatalogData(session.email);
      }
    }
  }, []);

  async function fetchCatalogData(email: string) {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [catalogRes, pricingRes] = await Promise.all([
        fetch(`/api/seller/approved-products?email=${encodeURIComponent(email)}`),
        fetch("/api/pricing")
      ]);

      const catalogData = await catalogRes.json();
      const pricingData = await pricingRes.json();

      // Check for seller approval errors (e.g. 403 Forbidden)
      if (catalogRes.status === 403) {
        setApprovalStatus(catalogData.status || "pending");
        setErrorMessage(catalogData.error);
        setLoading(false);
        return;
      }

      if (catalogData.success) {
        setApprovedProducts(catalogData.allowedProducts || []);
      } else {
        setErrorMessage(catalogData.error || "Failed to load catalog.");
      }

      if (!pricingData.error) {
        setPricingRules(pricingData);
      }
    } catch (err) {
      setErrorMessage("Could not connect to the database.");
    } finally {
      setLoading(false);
    }
  }

  // Handle logout
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sellerSession");
    }
    router.push("/seller/login");
  };

  // Pricing math utility
  const getDisplayPriceRange = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return "₹0";

    const profit = product.profitPercentage || 0;
    const dutyMultiplier = selectedCountry ? 1 + selectedCountry.dutyPercentage / 100 : 1;

    const prices = product.variants.map((v) => {
      const baseCost = v.finalPrice;
      const sellingPrice = baseCost * (1 + profit / 100);
      return Math.round(sellingPrice * dutyMultiplier);
    });

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return minPrice === maxPrice
      ? `₹${minPrice.toLocaleString()}`
      : `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`;
  };

  const calculateVariantFinalPrice = (baseCost: number, profitPercentage: number) => {
    const sellingPrice = baseCost * (1 + profitPercentage / 100);
    const dutyMultiplier = selectedCountry ? 1 + selectedCountry.dutyPercentage / 100 : 1;
    return Math.round(sellingPrice * dutyMultiplier);
  };

  if (isLoggedOut) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-8 max-w-md text-center flex flex-col gap-4 shadow-lg">
          <svg className="h-12 w-12 mx-auto text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="font-bold text-lg">Seller Authorization Required</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Please log in with your seller partner credentials to view your approved jewelry collections.
          </p>
          <Link href="/seller/login" className="mt-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold inline-block transition-colors shadow-md">
            Go to Seller Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Loading Seller Catalog...</span>
        </div>
      </div>
    );
  }

  if (errorMessage && approvalStatus !== "approved") {
    const isRejected = approvalStatus === "rejected";
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className={`border rounded-2xl p-8 max-w-md text-center flex flex-col gap-4 shadow-lg ${
          isRejected 
            ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
            : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500"
        }`}>
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isRejected ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <h3 className="font-bold text-lg capitalize">{approvalStatus === "rejected" ? "Account Rejected" : "Approval Pending"}</h3>
          <p className="text-sm leading-relaxed">{errorMessage}</p>
          <button onClick={handleLogout} className="mt-2 px-6 py-2 bg-zinc-900 text-white dark:bg-zinc-800 rounded-lg font-semibold inline-block transition-colors shadow-md">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Banner Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-amber-500 font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
            Seller Storefront
          </span>
          <span className="text-zinc-350">|</span>
          <div>
            <h1 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Welcome, {sellerName}
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">View your approved collections and configure duty metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Country Custom Duty Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Destination Country:
            </label>
            <select
              value={selectedCountry?.country || "none"}
              onChange={(e) => {
                const selected = pricingRules?.customDuties?.find(c => c.country === e.target.value);
                setSelectedCountry(selected || null);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-bold cursor-pointer"
            >
              <option value="none">None (Base Price)</option>
              {pricingRules?.customDuties?.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country} (+{c.dutyPercentage}%)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-xs hover:text-rose-500 transition-colors font-semibold rounded-lg cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Catalog view */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {approvedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm gap-4 text-center">
            <svg className="h-16 w-16 text-zinc-300 dark:text-zinc-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div>
              <h3 className="text-lg font-bold">No Products Allocated</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                The administrator has not allocated any catalog items to your seller account yet. Please contact support.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedProducts.map((prod) => {
              const hasImages = prod.images && prod.images.length > 0;
              const defaultImage = hasImages ? prod.images[0] : "";
              const formattedPriceRange = getDisplayPriceRange(prod);

              return (
                <div 
                  key={prod._id}
                  onClick={() => {
                    setSelectedProduct(prod);
                    setActiveImageIdx(0);
                  }}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all flex flex-col overflow-hidden group cursor-pointer"
                >
                  {/* Card Media Header */}
                  <div className="h-48 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                    {hasImages ? (
                      <img 
                        src={defaultImage} 
                        alt={prod.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-400">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] uppercase tracking-wider font-semibold">No Image</span>
                      </div>
                    )}
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 bg-amber-500 text-white rounded-md capitalize shadow-sm">
                      {prod.category}
                    </span>
                    <span className="absolute bottom-3 left-3 text-[10px] font-semibold px-2 py-1 bg-zinc-900/80 text-white backdrop-blur-sm rounded-md shadow-sm">
                      {prod.variants?.length || 0} Options
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        PRODUCT CODE: {prod.productId}
                      </span>
                      <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-150 group-hover:text-amber-500 transition-colors line-clamp-1">
                        {prod.name}
                      </h3>
                      {prod.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <span>Weights: {prod.metalWeight}g (Metal) {prod.diamondWeight > 0 ? `/ ${prod.diamondWeight}ct (Diamond)` : ""}</span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-amber-500/[0.03] p-3 rounded-xl border border-amber-500/10">
                        <div>
                          <span className="block text-[8px] text-zinc-400 uppercase tracking-wider font-bold">
                            {selectedCountry ? `Selling Price (${selectedCountry.country})` : "Selling Price (Base)"}
                          </span>
                          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-500">{formattedPriceRange}</span>
                        </div>
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-0.5">
                          View details
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* OVERLAY DRILLDOWN MODAL FOR PRODUCT DETAILS */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="font-extrabold text-lg text-amber-600 dark:text-amber-500">
                  {selectedProduct.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Product Code: {selectedProduct.productId} | Category: {selectedProduct.category.toUpperCase()}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
              
              {/* Media Gallery (Left Side) */}
              <div className="w-full lg:w-96 flex flex-col gap-3 shrink-0">
                <div className="h-72 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img 
                      src={selectedProduct.images[activeImageIdx]} 
                      alt={selectedProduct.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="h-12 w-12 text-zinc-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Thumbnails grid */}
                <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                  {selectedProduct.images?.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className={`w-14 h-14 border rounded-lg overflow-hidden shrink-0 transition-all ${
                        activeImageIdx === i ? "border-amber-500 ring-2 ring-amber-500/20" : "border-zinc-200 hover:border-zinc-350"
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                {/* Core specifications card */}
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col gap-2.5 text-[11px] font-bold text-zinc-500 mt-2">
                  <div className="flex justify-between">
                    <span>Metal Weight:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedProduct.metalWeight}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diamond Weight:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedProduct.diamondWeight || 0}ct</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Profit Markup:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedProduct.profitPercentage || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Specifications and Variants List (Right Side) */}
              <div className="flex-1 flex flex-col gap-6">
                
                {/* Description */}
                {selectedProduct.description && (
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Description</h4>
                    <p className="text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Variants Manifest Table */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                      Product Options & Pricing Breakdown
                    </h4>
                    {selectedCountry && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {selectedCountry.country} Custom Duty (+{selectedCountry.dutyPercentage}%) Included
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[35vh]">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-[11px] font-semibold">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3">Metal details</th>
                          <th className="py-2.5 px-3">Diamond details</th>
                          <th className="py-2.5 px-3">Cost (Base)</th>
                          <th className="py-2.5 px-3">Selling Price (Base)</th>
                          <th className="py-2.5 px-3 text-amber-600 dark:text-amber-500">
                            {selectedCountry ? `Final Price (${selectedCountry.country})` : "Final Price (Base)"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                        {selectedProduct.variants?.map((v) => {
                          const baseCost = v.finalPrice;
                          const baseSellingPrice = Math.round(baseCost * (1 + selectedProduct.profitPercentage / 100) * 100) / 100;
                          const finalDutyPrice = calculateVariantFinalPrice(baseCost, selectedProduct.profitPercentage);

                          return (
                            <tr key={v.sku} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-350">{v.sku}</td>
                              <td className="py-2.5 px-3 capitalize">
                                {v.metalName} {v.metalName === "gold" ? `(${v.purity})` : ""}
                              </td>
                              <td className="py-2.5 px-3">
                                {selectedProduct.diamondWeight > 0 && v.diamondType !== "N/A" ? (
                                  <span className="block text-[9px] leading-tight text-zinc-500">
                                    {v.diamondType} / {v.diamondShape} / {v.diamondColor} / {v.diamondClarity}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 italic">None</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">₹{(baseCost - v.priceChange).toLocaleString()}</td>
                              <td className="py-2.5 px-3">₹{baseSellingPrice.toLocaleString()}</td>
                              <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-500 text-xs">
                                ₹{finalDutyPrice.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end bg-zinc-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-5 py-2 bg-zinc-900 text-white dark:bg-zinc-850 hover:bg-amber-500 transition-colors rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                Close Catalog Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
