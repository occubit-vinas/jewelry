'use client'

import { useEffect, useState } from "react";
import Link from "next/link";

interface Metal {
  name: string;
  basePricePer10g: number;
  purityDropPercentPerCarat?: number;
}

interface Modifier {
  name: string;
  percentageIncrease: number;
}

interface PricingConfig {
  metals: Metal[];
  diamond: {
    basePricePerCarat: number;
    types: Modifier[];
    shapes: Modifier[];
    colors: Modifier[];
    clarities: Modifier[];
  };
  customDuties: {
    country: string;
    dutyPercentage: number;
  }[];
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
  finalPrice: number;
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
  makingCharge: number;
  designCharge: number;
  profitPercentage: number;
  variants: ProductVariant[];
  createdAt: string;
}

const CATEGORIES = ["ring", "ear rings", "neckless", "braslet", "chain", "bengels"];

export default function ProductListingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Inline edit state for profit percentage
  const [savingProfitId, setSavingProfitId] = useState<string | null>(null);
  const [profitValues, setProfitValues] = useState<{ [id: string]: number }>({});
  
  // Modal Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("ring");
  const [editMetalWeight, setEditMetalWeight] = useState(0);
  const [editDiamondWeight, setEditDiamondWeight] = useState(0);
  const [editMakingCharge, setEditMakingCharge] = useState(0);
  const [editDesignCharge, setEditDesignCharge] = useState(0);
  const [editProfitPercentage, setEditProfitPercentage] = useState(0);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  
  // Feedback states
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Clear feedback messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Load products and pricing rules on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [prodRes, priceRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/pricing")
      ]);
      const prodData = await prodRes.json();
      const priceData = await priceRes.json();

      setProducts(prodData || []);
      
      // Initialize profit inputs mapping
      const initialProfits: { [id: string]: number } = {};
      prodData.forEach((p: Product) => {
        initialProfits[p._id] = p.profitPercentage || 0;
      });
      setProfitValues(initialProfits);

      if (!priceData.error) {
        setPricingRules(priceData);
      }
    } catch (err) {
      setMessage({ text: "Failed to connect to database.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Price Calculation Helper
  const calculatePrice = ({
    metalName,
    purity,
    diamondType,
    diamondShape,
    diamondColor,
    diamondClarity,
    metalWeightVal,
    diamondWeightVal,
    makingVal,
    designVal,
    priceChange,
  }: {
    metalName: string;
    purity: string;
    diamondType: string;
    diamondShape: string;
    diamondColor: string;
    diamondClarity: string;
    metalWeightVal: number;
    diamondWeightVal: number;
    makingVal: number;
    designVal: number;
    priceChange: number;
  }) => {
    if (!pricingRules) return 0;

    // 1. Metal Cost
    const metalRule = pricingRules.metals?.find(
      (m) => m.name.toLowerCase() === metalName.toLowerCase()
    );
    let metalPricePer10g = metalRule ? metalRule.basePricePer10g : 0;

    if (metalName.toLowerCase() === "gold") {
      const karatVal = parseInt(purity.replace("K", "")) || 22;
      const caratDrop = 24 - karatVal;
      const dropPercent = metalRule ? metalRule.purityDropPercentPerCarat || 0 : 0;
      metalPricePer10g = metalPricePer10g * (1 - (caratDrop * dropPercent) / 100);
    }

    const metalCost = (metalWeightVal / 10) * metalPricePer10g;

    // 2. Diamond Cost
    let diamondCost = 0;
    if (diamondWeightVal > 0 && pricingRules.diamond) {
      const basePricePerCarat = pricingRules.diamond.basePricePerCarat || 0;
      let percentageIncrease = 0;

      const findMod = (list: Modifier[] | undefined, name: string) => {
        if (!list || name === "N/A") return 0;
        const item = list.find((m) => m.name.toLowerCase() === name.toLowerCase());
        return item ? item.percentageIncrease : 0;
      };

      percentageIncrease += findMod(pricingRules.diamond.types, diamondType);
      percentageIncrease += findMod(pricingRules.diamond.shapes, diamondShape);
      percentageIncrease += findMod(pricingRules.diamond.colors, diamondColor);
      percentageIncrease += findMod(pricingRules.diamond.clarities, diamondClarity);

      diamondCost = diamondWeightVal * basePricePerCarat * (1 + percentageIncrease / 100);
    }

    const total = metalCost + diamondCost + makingVal + designVal + priceChange;
    return Math.round(total * 100) / 100;
  };

  // Recalculate editing variant prices when general editor inputs change
  useEffect(() => {
    if (!editingProduct || !pricingRules) return;
    setEditVariants((prev) =>
      prev.map((v) => {
        const newPrice = calculatePrice({
          metalName: v.metalName,
          purity: v.purity,
          diamondType: v.diamondType,
          diamondShape: v.diamondShape,
          diamondColor: v.diamondColor,
          diamondClarity: v.diamondClarity,
          metalWeightVal: editMetalWeight,
          diamondWeightVal: editDiamondWeight,
          makingVal: editMakingCharge,
          designVal: editDesignCharge,
          priceChange: v.priceChange,
        });
        return { ...v, finalPrice: newPrice };
      })
    );
  }, [editMetalWeight, editDiamondWeight, editMakingCharge, editDesignCharge, pricingRules, editingProduct]);

  // Save inline profit percentage changes
  const saveProfitPercentage = async (id: string) => {
    const newVal = profitValues[id] ?? 0;
    try {
      setSavingProfitId(id);
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profitPercentage: newVal }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) => (p._id === id ? { ...p, profitPercentage: newVal } : p))
        );
        setMessage({ text: "Profit percentage updated successfully!", type: "success" });
      } else {
        throw new Error(data.error || "Failed to save profit");
      }
    } catch (err) {
      setMessage({ text: `Update error: ${String(err)}`, type: "error" });
    } finally {
      setSavingProfitId(null);
    }
  };

  // Delete product completely
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p._id !== id));
        setMessage({ text: "Product deleted successfully.", type: "success" });
      } else {
        throw new Error(data.error || "Delete failed");
      }
    } catch (err) {
      setMessage({ text: `Delete error: ${String(err)}`, type: "error" });
    }
  };

  // Modal Editing Open
  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditDescription(prod.description || "");
    setEditCategory(prod.category);
    setEditMetalWeight(prod.metalWeight);
    setEditDiamondWeight(prod.diamondWeight || 0);
    setEditMakingCharge(prod.makingCharge);
    setEditDesignCharge(prod.designCharge);
    setEditProfitPercentage(prod.profitPercentage || 0);
    setEditImages(prod.images || []);
    setEditVariants(prod.variants || []);
  };

  // Modal Editor Handlers
  const handleEditPriceChange = (sku: string, value: string) => {
    const numericVal = parseFloat(value) || 0;
    setEditVariants((prev) =>
      prev.map((v) => {
        if (v.sku !== sku) return v;
        const newPrice = calculatePrice({
          metalName: v.metalName,
          purity: v.purity,
          diamondType: v.diamondType,
          diamondShape: v.diamondShape,
          diamondColor: v.diamondColor,
          diamondClarity: v.diamondClarity,
          metalWeightVal: editMetalWeight,
          diamondWeightVal: editDiamondWeight,
          makingVal: editMakingCharge,
          designVal: editDesignCharge,
          priceChange: numericVal,
        });
        return { ...v, priceChange: numericVal, finalPrice: newPrice };
      })
    );
  };

  const deleteEditVariant = (sku: string) => {
    setEditVariants((prev) => prev.filter((v) => v.sku !== sku));
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (images: string[]) => void) => {
    const files = e.target.files;
    if (!files) return;

    const base64Promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(base64Promises).then((imgs) => callback(imgs));
  };

  const handleEditVariantFileUpload = (sku: string, imgs: string[]) => {
    setEditVariants((prev) =>
      prev.map((v) => (v.sku === sku ? { ...v, images: [...v.images, ...imgs] } : v))
    );
  };

  const removeEditVariantImage = (sku: string, imgIdx: number) => {
    setEditVariants((prev) =>
      prev.map((v) => (v.sku === sku ? { ...v, images: v.images.filter((_, i) => i !== imgIdx) } : v))
    );
  };

  const handleSaveModal = async () => {
    if (!editingProduct) return;
    if (!editName || editMetalWeight <= 0) {
      setMessage({ text: "Please enter product name and metal weight.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: editName,
        description: editDescription,
        category: editCategory,
        metalWeight: editMetalWeight,
        diamondWeight: editDiamondWeight,
        makingCharge: editMakingCharge,
        designCharge: editDesignCharge,
        profitPercentage: editProfitPercentage,
        images: editImages,
        variants: editVariants,
      };

      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) => (p._id === editingProduct._id ? { ...p, ...payload, _id: p._id, productId: p.productId, createdAt: p.createdAt } : p))
        );
        // Sync the listing input state
        setProfitValues((prev) => ({ ...prev, [editingProduct._id]: editProfitPercentage }));
        setMessage({ text: "Product details saved successfully!", type: "success" });
        setEditingProduct(null);
      } else {
        throw new Error(data.error || "Update failed");
      }
    } catch (err) {
      setMessage({ text: `Save error: ${String(err)}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Loading Product Catalog...</span>
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
              Products Management Console
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">View products, set profit markup percentages, and refine variants</p>
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
            href="/admin/add_product"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </Link>
        </div>
      </header>

      {/* Main Listing View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm gap-4">
            <svg className="h-16 w-16 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div className="text-center">
              <h3 className="text-lg font-bold">No Products Registered</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Configure your raw pricing sheets and insert your first product catalog to populate this dashboard.
              </p>
            </div>
            <Link href="/admin/add_product" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-md transition-colors">
              Add First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => {
              const hasImages = prod.images && prod.images.length > 0;
              const defaultImage = hasImages ? prod.images[0] : "";
              const activeProfit = prod.profitPercentage || 0;

              // Compute Min/Max selling price boundaries with profit
              const variantPrices = prod.variants?.map(
                (v) => v.finalPrice * (1 + activeProfit / 100)
              ) || [0];
              const minPrice = Math.min(...variantPrices);
              const maxPrice = Math.max(...variantPrices);
              const formattedPriceRange = minPrice === maxPrice 
                ? `₹${minPrice.toLocaleString()}` 
                : `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`;

              return (
                <div 
                  key={prod._id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
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
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 bg-amber-500 text-white rounded-md capitalize shadow-sm">
                      {prod.category}
                    </span>
                    <span className="absolute bottom-3 left-3 text-[10px] font-semibold px-2 py-1 bg-zinc-900/80 text-white backdrop-blur-sm rounded-md shadow-sm">
                      {prod.variants?.length || 0} Variants
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div>
                      <span className="block text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        SKU PREFIX: {prod.productId}
                      </span>
                      <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 group-hover:text-amber-500 transition-colors line-clamp-1">
                        {prod.name}
                      </h3>
                      {prod.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850 gap-2">
                      <div>Metal Weight: <span className="text-zinc-800 dark:text-zinc-200">{prod.metalWeight}g</span></div>
                      <div>Diamond Weight: <span className="text-zinc-800 dark:text-zinc-200">{prod.diamondWeight || 0}ct</span></div>
                    </div>

                    {/* Pricing Markup Info */}
                    <div className="flex justify-between items-center bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                      <div>
                        <span className="block text-[9px] text-zinc-400 uppercase tracking-wider font-bold">Selling Price Range</span>
                        <span className="text-sm font-extrabold text-amber-600 dark:text-amber-500">{formattedPriceRange}</span>
                      </div>
                    </div>

                    {/* Inline Profit configuration */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                        Adjust Profit Markup (%)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={profitValues[prod._id] ?? 0}
                            onChange={(e) => setProfitValues({ ...profitValues, [prod._id]: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full pl-3 pr-7 py-1.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-bold"
                          />
                          <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-zinc-400">%</span>
                        </div>
                        <button
                          onClick={() => saveProfitPercentage(prod._id)}
                          disabled={savingProfitId === prod._id}
                          className="px-3 py-1.5 text-xs bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg hover:bg-amber-500 hover:text-white transition-all font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {savingProfitId === prod._id ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-850 flex justify-between gap-4">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="text-xs flex items-center gap-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 font-bold transition-colors cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit details
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod._id, prod.name)}
                      className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-rose-500 font-semibold transition-colors cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* DETAILED OVERLAY MODAL FOR EDITING PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="font-extrabold text-lg text-amber-600 dark:text-amber-500">
                  Edit Product Details
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Modify details for SKU prefix: {editingProduct.productId}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* Core Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Profit Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={editProfitPercentage}
                    onChange={(e) => setEditProfitPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Weights and Charges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Metal Weight (gm) *
                  </label>
                  <input
                    type="number"
                    value={editMetalWeight}
                    onChange={(e) => setEditMetalWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Diamond Weight (ct)
                  </label>
                  <input
                    type="number"
                    value={editDiamondWeight}
                    onChange={(e) => setEditDiamondWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Making Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={editMakingCharge}
                    onChange={(e) => setEditMakingCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Design Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={editDesignCharge}
                    onChange={(e) => setEditDesignCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* General Images Section */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                  General Product Media
                </label>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="w-20 h-20 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleEditFileUpload(e, (imgs) => setEditImages([...editImages, ...imgs]))}
                      className="hidden"
                    />
                  </label>

                  {editImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-hidden group bg-zinc-100 dark:bg-zinc-900 shadow-sm">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setEditImages(editImages.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 cursor-pointer"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Variants Manifest Table */}
              <div className="border-t border-zinc-150 dark:border-zinc-800 pt-4 flex flex-col gap-3">
                <h4 className="font-bold text-xs text-amber-600 dark:text-amber-500">
                  Variants Pricing & Specification Matrix
                </h4>
                
                <div className="overflow-x-auto max-h-[30vh] border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  {editVariants.length === 0 ? (
                    <p className="text-center italic text-xs text-zinc-400 py-6">No variants mapped for this product.</p>
                  ) : (
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-[11px] font-semibold">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3">Metal</th>
                          <th className="py-2.5 px-3">Diamond Specs</th>
                          <th className="py-2.5 px-3">Cost (Base)</th>
                          <th className="py-2.5 px-3 w-28">Price Change (₹)</th>
                          <th className="py-2.5 px-3">Markup Price</th>
                          <th className="py-2.5 px-3">Media</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                        {editVariants.map((v) => {
                          const baseCost = v.finalPrice;
                          const sellingPrice = Math.round(baseCost * (1 + editProfitPercentage / 100) * 100) / 100;
                          return (
                            <tr key={v.sku} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                              <td className="py-2 px-3 font-mono font-bold">{v.sku}</td>
                              <td className="py-2 px-3 capitalize">
                                {v.metalName} {v.metalName === "gold" ? `(${v.purity})` : ""}
                              </td>
                              <td className="py-2 px-3">
                                {editDiamondWeight > 0 && v.diamondType !== "N/A" ? (
                                  <span className="block text-[9px] leading-tight text-zinc-500">
                                    {v.diamondType} / {v.diamondShape} / {v.diamondColor} / {v.diamondClarity}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 italic">None</span>
                                )}
                              </td>
                              <td className="py-2 px-3">₹{(baseCost - v.priceChange).toLocaleString()}</td>
                              
                              {/* Price Change */}
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={v.priceChange || ""}
                                  placeholder="0.00"
                                  onChange={(e) => handleEditPriceChange(v.sku, e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded font-bold text-center text-xs"
                                />
                              </td>
                              
                              {/* Final price with markup */}
                              <td className="py-2 px-3 font-bold text-amber-600 dark:text-amber-500">
                                ₹{sellingPrice.toLocaleString()}
                              </td>

                              {/* Images */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <label className="p-1 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 rounded cursor-pointer transition-colors">
                                    <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/*"
                                      onChange={(e) => handleEditFileUpload(e, (imgs) => handleEditVariantFileUpload(v.sku, imgs))}
                                      className="hidden"
                                    />
                                  </label>
                                  <div className="flex gap-1 overflow-x-auto max-w-[80px]">
                                    {v.images?.map((img, idx) => (
                                      <div key={idx} className="relative w-6 h-6 border border-zinc-200 dark:border-zinc-850 rounded shrink-0 group/img overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button
                                          onClick={() => removeEditVariantImage(v.sku, idx)}
                                          className="absolute inset-0 bg-rose-600/70 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-[6px] font-bold cursor-pointer"
                                        >
                                          Del
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* Action */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => deleteEditVariant(v.sku)}
                                  className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Action Footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
