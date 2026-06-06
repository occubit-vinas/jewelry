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
  images: string[]; // Base64
  finalPrice: number;
}

const CATEGORIES = ["ring", "ear rings", "neckless", "braslet", "chain", "bengels"];
const GOLD_PURITIES = ["14K", "18K", "22K", "24K"];
const DEFAULT_METALS = ["gold", "rose gold", "platinum", "silver"];

export default function AddProductPage() {
  const [pricingRules, setPricingRules] = useState<PricingConfig | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Form Fields
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("ring");
  const [metalWeight, setMetalWeight] = useState<number>(0);
  const [diamondWeight, setDiamondWeight] = useState<number>(0);
  const [makingCharge, setMakingCharge] = useState<number>(0);
  const [designCharge, setDesignCharge] = useState<number>(0);
  const [generalImages, setGeneralImages] = useState<string[]>([]);

  // Multiselect Selections
  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedGoldPurities, setSelectedGoldPurities] = useState<string[]>(["22K"]);
  const [selectedDiamondTypes, setSelectedDiamondTypes] = useState<string[]>([]);
  const [selectedDiamondShapes, setSelectedDiamondShapes] = useState<string[]>([]);
  const [selectedDiamondColors, setSelectedDiamondColors] = useState<string[]>([]);
  const [selectedDiamondClarities, setSelectedDiamondClarities] = useState<string[]>([]);

  // Variants and Deletions
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [deletedSkus, setDeletedSkus] = useState<string[]>([]);

  // Submission State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Load pricing rules on mount
  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoading(true);
        const res = await fetch("/api/pricing");
        const data = await res.json();
        
        if (data.error) {
          setPricingError("Please configure pricing rules first under admin raw listing.");
        } else {
          setPricingRules(data);
        }
      } catch (err) {
        setPricingError("Failed to connect to pricing configuration database.");
      } finally {
        setLoading(false);
      }
    }
    fetchPricing();
  }, []);

  // Calculate final variant price helper
  const calculatePrice = ({
    metalName,
    purity,
    diamondType,
    diamondShape,
    diamondColor,
    diamondClarity,
    priceChange,
  }: {
    metalName: string;
    purity: string;
    diamondType: string;
    diamondShape: string;
    diamondColor: string;
    diamondClarity: string;
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

    const metalCost = (metalWeight / 10) * metalPricePer10g;

    // 2. Diamond Cost
    let diamondCost = 0;
    if (diamondWeight > 0 && pricingRules.diamond) {
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

      diamondCost = diamondWeight * basePricePerCarat * (1 + percentageIncrease / 100);
    }

    const total = metalCost + diamondCost + makingCharge + designCharge + priceChange;
    return Math.round(total * 100) / 100;
  };

  // Generate variants list dynamically
  useEffect(() => {
    if (!pricingRules) return;

    // Build Metal Options list
    const metalOptions: { name: string; purity: string }[] = [];
    selectedMetals.forEach((metal) => {
      if (metal === "gold") {
        selectedGoldPurities.forEach((purity) => {
          metalOptions.push({ name: "gold", purity });
        });
      } else {
        metalOptions.push({ name: metal, purity: "N/A" });
      }
    });

    if (metalOptions.length === 0) {
      setVariants([]);
      return;
    }

    // Diamond parameters lists
    const useDiamond = diamondWeight > 0;
    const types = useDiamond && selectedDiamondTypes.length > 0 ? selectedDiamondTypes : ["N/A"];
    const shapes = useDiamond && selectedDiamondShapes.length > 0 ? selectedDiamondShapes : ["N/A"];
    const colors = useDiamond && selectedDiamondColors.length > 0 ? selectedDiamondColors : ["N/A"];
    const clarities = useDiamond && selectedDiamondClarities.length > 0 ? selectedDiamondClarities : ["N/A"];

    const generated: ProductVariant[] = [];

    metalOptions.forEach((metalOpt) => {
      types.forEach((dType) => {
        shapes.forEach((dShape) => {
          colors.forEach((dColor) => {
            clarities.forEach((dClarity) => {
              // Generate unique SKU
              const mCode = metalOpt.name === "gold" ? `G${metalOpt.purity.replace("K", "")}` : (metalOpt.name === "rose gold" ? "RG" : metalOpt.name === "platinum" ? "PT" : "S");
              const tCode = dType === "N/A" ? "" : `-${dType.substring(0, 3).toUpperCase()}`;
              const sCode = dShape === "N/A" ? "" : `-${dShape.substring(0, 3).toUpperCase()}`;
              const cCode = dColor === "N/A" ? "" : `-${dColor.toUpperCase()}`;
              const clCode = dClarity === "N/A" ? "" : `-${dClarity.toUpperCase()}`;

              const sku = `${productId || "PROD"}-${mCode}${tCode}${sCode}${cCode}${clCode}`;

              // Skip if admin deleted it
              if (deletedSkus.includes(sku)) return;

              // Retain values if already set
              const existing = variants.find((v) => v.sku === sku);
              const priceChange = existing ? existing.priceChange : 0;
              const images = existing ? existing.images : [];

              const finalPrice = calculatePrice({
                metalName: metalOpt.name,
                purity: metalOpt.purity,
                diamondType: dType,
                diamondShape: dShape,
                diamondColor: dColor,
                diamondClarity: dClarity,
                priceChange,
              });

              generated.push({
                sku,
                metalName: metalOpt.name,
                purity: metalOpt.purity,
                diamondType: dType,
                diamondShape: dShape,
                diamondColor: dColor,
                diamondClarity: dClarity,
                priceChange,
                images,
                finalPrice,
              });
            });
          });
        });
      });
    });

    setVariants(generated);
  }, [
    productId,
    selectedMetals,
    selectedGoldPurities,
    selectedDiamondTypes,
    selectedDiamondShapes,
    selectedDiamondColors,
    selectedDiamondClarities,
    metalWeight,
    diamondWeight,
    makingCharge,
    designCharge,
    pricingRules,
  ]);

  // Recalculate variant prices if general pricing changes or price change input changes
  const handlePriceChange = (sku: string, value: string) => {
    const numericVal = parseFloat(value) || 0;
    setVariants((prev) =>
      prev.map((v) => {
        if (v.sku !== sku) return v;
        const newPrice = calculatePrice({
          metalName: v.metalName,
          purity: v.purity,
          diamondType: v.diamondType,
          diamondShape: v.diamondShape,
          diamondColor: v.diamondColor,
          diamondClarity: v.diamondClarity,
          priceChange: numericVal,
        });
        return { ...v, priceChange: numericVal, finalPrice: newPrice };
      })
    );
  };

  // Delete variant from table
  const deleteVariant = (sku: string) => {
    setDeletedSkus((prev) => [...prev, sku]);
    setVariants((prev) => prev.filter((v) => v.sku !== sku));
  };

  // Convert files to Base64 utility
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (images: string[]) => void) => {
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

  // Variant image uploader
  const handleVariantFileUpload = (sku: string, imgs: string[]) => {
    setVariants((prev) =>
      prev.map((v) => (v.sku === sku ? { ...v, images: [...v.images, ...imgs] } : v))
    );
  };

  const removeVariantImage = (sku: string, idx: number) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.sku !== sku) return v;
        return { ...v, images: v.images.filter((_, i) => i !== idx) };
      })
    );
  };

  // Toggle selection arrays utility
  const toggleSelection = (val: string, list: string[], setList: (arr: string[]) => void) => {
    if (list.includes(val)) {
      setList(list.filter((x) => x !== val));
    } else {
      setList([...list, val]);
    }
  };

  // Add Product form submission
  const handleSubmit = async () => {
    if (!productName || !productId || metalWeight <= 0) {
      setMessage({ text: "Please fill in Product Name, Product ID, and Metal Weight.", type: "error" });
      return;
    }

    if (variants.length === 0) {
      setMessage({ text: "Please configure and select at least one metal variant.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        name: productName,
        productId,
        description,
        category,
        images: generalImages,
        metalWeight,
        diamondWeight,
        makingCharge,
        designCharge,
        variants,
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: "Product and variants created successfully!", type: "success" });
        // Reset inputs
        setProductName("");
        setProductId("");
        setDescription("");
        setMetalWeight(0);
        setDiamondWeight(0);
        setMakingCharge(0);
        setDesignCharge(0);
        setGeneralImages([]);
        setSelectedMetals([]);
        setVariants([]);
        setDeletedSkus([]);
      } else {
        throw new Error(data.error || "Failed to create product");
      }
    } catch (err) {
      setMessage({ text: `Creation error: ${String(err)}`, type: "error" });
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
          <span className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Loading Pricing Context...</span>
        </div>
      </div>
    );
  }

  if (pricingError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-8 max-w-md text-center flex flex-col gap-4 shadow-lg">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="font-bold text-lg">Configuration Required</h3>
          <p className="text-sm leading-relaxed">{pricingError}</p>
          <Link href="/admin/raw_listing" className="mt-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold inline-block transition-colors shadow-md">
            Go to Raw Pricing Setup
          </Link>
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
              Add New Product Catalog
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Insert new items and auto-configure customized variant metrics</p>
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
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving Product...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </>
            )}
          </button>
        </div>
      </header>

      {/* Form Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Core Product Fields */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <h2 className="text-base font-bold text-amber-600 dark:text-amber-500 border-b border-zinc-100 dark:border-zinc-850 pb-2">
            1. Core Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="E.g. Royal Solitaire Ring"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Product ID / SKU Prefix *
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="E.g. RING-SOL"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Jewelry Type *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Metal Weight (in gm) *
              </label>
              <input
                type="number"
                value={metalWeight || ""}
                onChange={(e) => setMetalWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.0"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Diamond Weight (in carat)
              </label>
              <input
                type="number"
                value={diamondWeight || ""}
                onChange={(e) => setDiamondWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.0"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Making Charge (in ₹)
              </label>
              <input
                type="number"
                value={makingCharge || ""}
                onChange={(e) => setMakingCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.0"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                Design Charge (in ₹)
              </label>
              <input
                type="number"
                value={designCharge || ""}
                onChange={(e) => setDesignCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.0"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the jewelry design, craftsmanship, style specifications..."
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-sm font-medium"
            />
          </div>

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              General Product Images
            </label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="w-28 h-28 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-semibold text-zinc-500 mt-1">Upload</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, (imgs) => setGeneralImages([...generalImages, ...imgs]))}
                  className="hidden"
                />
              </label>

              {generalImages.map((img, idx) => (
                <div key={idx} className="relative w-28 h-28 border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-hidden group shadow-sm bg-zinc-100 dark:bg-zinc-900">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setGeneralImages(generalImages.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow cursor-pointer"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Variants Selection Panels */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <h2 className="text-base font-bold text-amber-600 dark:text-amber-500 border-b border-zinc-100 dark:border-zinc-850 pb-2">
            2. Configure Variant Criteria
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Metals configuration */}
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Selected Metals</h3>
                <p className="text-[10px] text-zinc-400">Select which base metals are offered for this design</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {DEFAULT_METALS.map((metal) => {
                  const isSelected = selectedMetals.includes(metal);
                  return (
                    <button
                      key={metal}
                      type="button"
                      onClick={() => toggleSelection(metal, selectedMetals, setSelectedMetals)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer capitalize ${
                        isSelected 
                          ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-500 shadow-sm" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800"
                      }`}
                    >
                      {metal}
                    </button>
                  );
                })}
              </div>

              {/* Gold Carat details nested if Gold selected */}
              {selectedMetals.includes("gold") && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl flex flex-col gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Gold Purity Selection</h4>
                    <p className="text-[9px] text-zinc-400">Select active gold karats for variants</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GOLD_PURITIES.map((karat) => {
                      const isSelected = selectedGoldPurities.includes(karat);
                      return (
                        <button
                          key={karat}
                          type="button"
                          onClick={() => toggleSelection(karat, selectedGoldPurities, setSelectedGoldPurities)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                              : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800"
                          }`}
                        >
                          {karat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Diamond parameters configuration */}
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Selected Diamond Parameters</h3>
                <p className="text-[10px] text-zinc-400">Active modifiers based on your loaded raw listings</p>
              </div>

              {diamondWeight === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950">
                  <p className="text-xs text-zinc-400 italic text-center leading-relaxed">
                    Set a Diamond Weight &gt; 0 in the form above to activate diamond parameter selections.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Types */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-zinc-500">Diamond Types</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {pricingRules?.diamond?.types?.map((item) => (
                        <label key={item.name} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            checked={selectedDiamondTypes.includes(item.name)}
                            onChange={() => toggleSelection(item.name, selectedDiamondTypes, setSelectedDiamondTypes)}
                            className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                          />
                          {item.name}
                        </label>
                      )) || <span className="text-[10px] italic text-zinc-400">No types defined</span>}
                    </div>
                  </div>

                  {/* Shapes */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-zinc-500">Shapes</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {pricingRules?.diamond?.shapes?.map((item) => (
                        <label key={item.name} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            checked={selectedDiamondShapes.includes(item.name)}
                            onChange={() => toggleSelection(item.name, selectedDiamondShapes, setSelectedDiamondShapes)}
                            className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                          />
                          {item.name}
                        </label>
                      )) || <span className="text-[10px] italic text-zinc-400">No shapes defined</span>}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-zinc-500">Colors</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {pricingRules?.diamond?.colors?.map((item) => (
                        <label key={item.name} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            checked={selectedDiamondColors.includes(item.name)}
                            onChange={() => toggleSelection(item.name, selectedDiamondColors, setSelectedDiamondColors)}
                            className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                          />
                          {item.name}
                        </label>
                      )) || <span className="text-[10px] italic text-zinc-400">No colors defined</span>}
                    </div>
                  </div>

                  {/* Clarities */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-zinc-500">Clarities</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {pricingRules?.diamond?.clarities?.map((item) => (
                        <label key={item.name} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            checked={selectedDiamondClarities.includes(item.name)}
                            onChange={() => toggleSelection(item.name, selectedDiamondClarities, setSelectedDiamondClarities)}
                            className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                          />
                          {item.name}
                        </label>
                      )) || <span className="text-[10px] italic text-zinc-400">No clarities defined</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Product Variant Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <div>
              <h2 className="text-base font-bold text-amber-600 dark:text-amber-500">
                3. Product Variant Manifest
              </h2>
              <p className="text-[10px] text-zinc-500">Generated dynamic table matching selected metal and diamond criteria</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full">
              {variants.length} Active Combinations
            </span>
          </div>

          <div className="overflow-x-auto">
            {variants.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950">
                <p className="text-sm text-zinc-400 italic">No variants active. Select metal types to generate variants.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-zinc-250 dark:divide-zinc-800 text-left text-xs font-medium">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="py-3 px-4">SKU / Unique ID</th>
                    <th className="py-3 px-4">Metal Composition</th>
                    <th className="py-3 px-4">Diamond Specs</th>
                    <th className="py-3 px-4">Calculated Cost (Base)</th>
                    <th className="py-3 px-4 w-32">Price Change (₹)</th>
                    <th className="py-3 px-4">Final Price</th>
                    <th className="py-3 px-4">Media</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                  {variants.map((variant) => (
                    <tr key={variant.sku} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                      
                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {variant.sku}
                      </td>
                      
                      {/* Metal */}
                      <td className="py-3 px-4 capitalize">
                        <span className="block font-semibold text-zinc-800 dark:text-zinc-200">{variant.metalName}</span>
                        {variant.metalName === "gold" && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold">{variant.purity} purity</span>
                        )}
                      </td>
                      
                      {/* Diamond */}
                      <td className="py-3 px-4">
                        {diamondWeight > 0 && (variant.diamondType !== "N/A" || variant.diamondShape !== "N/A") ? (
                          <div className="flex flex-col text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-semibold">
                            <span>Type: {variant.diamondType}</span>
                            <span>Shape: {variant.diamondShape}</span>
                            <span>Color/Clarity: {variant.diamondColor} / {variant.diamondClarity}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">None</span>
                        )}
                      </td>
                      
                      {/* Base Price */}
                      <td className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                        ₹{(variant.finalPrice - variant.priceChange).toLocaleString()}
                      </td>

                      {/* Price Change */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={variant.priceChange || ""}
                          placeholder="+ / - ₹"
                          onChange={(e) => handlePriceChange(variant.sku, e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none font-bold text-center text-xs"
                        />
                      </td>

                      {/* Final Price */}
                      <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-500">
                        ₹{variant.finalPrice.toLocaleString()}
                      </td>

                      {/* Media Upload */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <label className="p-1.5 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 rounded-lg cursor-pointer transition-colors inline-block">
                            <svg className="h-4 w-4 text-zinc-400 hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, (imgs) => handleVariantFileUpload(variant.sku, imgs))}
                              className="hidden"
                            />
                          </label>

                          <div className="flex gap-1 max-w-[120px] overflow-x-auto">
                            {variant.images.map((img, i) => (
                              <div key={i} className="relative w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 group">
                                <img src={img} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => removeVariantImage(variant.sku, i)}
                                  className="absolute inset-0 bg-rose-600/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[8px] font-bold cursor-pointer"
                                >
                                  Del
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteVariant(variant.sku)}
                          className="text-zinc-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer"
                          title="Delete variant"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
