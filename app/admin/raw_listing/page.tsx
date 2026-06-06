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

const DEFAULT_METALS = ["gold", "rose gold", "platinum", "silver"];

export default function RawListingAdmin() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [activeTab, setActiveTab] = useState<"metals" | "diamonds" | "duties">("metals");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Clear message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch configuration on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const res = await fetch("/api/pricing");
        const data = await res.json();
        
        // Normalize metals
        const normalizedMetals: Metal[] = [];
        DEFAULT_METALS.forEach((name) => {
          const existing = data.metals?.find((m: any) => m.name === name);
          normalizedMetals.push({
            name,
            basePricePer10g: existing?.basePricePer10g || 0,
            purityDropPercentPerCarat: name === "gold" ? existing?.purityDropPercentPerCarat || 0 : undefined
          });
        });

        setConfig({
          metals: normalizedMetals,
          diamond: {
            basePricePerCarat: data.diamond?.basePricePerCarat || 0,
            types: data.diamond?.types || [],
            shapes: data.diamond?.shapes || [],
            colors: data.diamond?.colors || [],
            clarities: data.diamond?.clarities || [],
          },
          customDuties: data.customDuties || [],
        });
      } catch (err) {
        setMessage({ text: "Failed to load pricing data.", type: "error" });
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ text: "Raw material pricing saved successfully!", type: "success" });
      } else {
        throw new Error(result.error || "Failed to save data");
      }
    } catch (err) {
      setMessage({ text: `Save error: ${String(err)}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Metals Handlers
  const updateMetalPrice = (index: number, val: string) => {
    if (!config) return;
    const updated = [...config.metals];
    updated[index] = { ...updated[index], basePricePer10g: parseFloat(val) || 0 };
    setConfig({ ...config, metals: updated });
  };

  const updateGoldDrop = (index: number, val: string) => {
    if (!config) return;
    const updated = [...config.metals];
    updated[index] = { ...updated[index], purityDropPercentPerCarat: parseFloat(val) || 0 };
    setConfig({ ...config, metals: updated });
  };

  // Diamond Handlers
  const updateDiamondBase = (val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      diamond: { ...config.diamond, basePricePerCarat: parseFloat(val) || 0 }
    });
  };

  const addModifier = (listKey: "types" | "shapes" | "colors" | "clarities") => {
    if (!config) return;
    setConfig({
      ...config,
      diamond: {
        ...config.diamond,
        [listKey]: [...config.diamond[listKey], { name: "", percentageIncrease: 0 }]
      }
    });
  };

  const updateModifier = (
    listKey: "types" | "shapes" | "colors" | "clarities",
    index: number,
    field: "name" | "percentageIncrease",
    value: string
  ) => {
    if (!config) return;
    const list = [...config.diamond[listKey]];
    if (field === "percentageIncrease") {
      list[index] = { ...list[index], [field]: parseFloat(value) || 0 };
    } else {
      list[index] = { ...list[index], [field]: value };
    }
    setConfig({
      ...config,
      diamond: { ...config.diamond, [listKey]: list }
    });
  };

  const removeModifier = (listKey: "types" | "shapes" | "colors" | "clarities", index: number) => {
    if (!config) return;
    const list = config.diamond[listKey].filter((_, i) => i !== index);
    setConfig({
      ...config,
      diamond: { ...config.diamond, [listKey]: list }
    });
  };

  // Custom Duty Handlers
  const addDuty = () => {
    if (!config) return;
    setConfig({
      ...config,
      customDuties: [...config.customDuties, { country: "", dutyPercentage: 0 }]
    });
  };

  const updateDuty = (index: number, field: "country" | "dutyPercentage", value: string) => {
    if (!config) return;
    const list = [...config.customDuties];
    if (field === "dutyPercentage") {
      list[index] = { ...list[index], [field]: parseFloat(value) || 0 };
    } else {
      list[index] = { ...list[index], [field]: value };
    }
    setConfig({ ...config, customDuties: list });
  };

  const removeDuty = (index: number) => {
    if (!config) return;
    const list = config.customDuties.filter((_, i) => i !== index);
    setConfig({ ...config, customDuties: list });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Loading Configuration...</span>
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
              Raw Material Pricing Administration
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure global rates and modifiers for calculations</p>
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6">
          <button
            onClick={() => setActiveTab("metals")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "metals" 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
            }`}
          >
            Metals Pricing
          </button>
          <button
            onClick={() => setActiveTab("diamonds")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "diamonds" 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
            }`}
          >
            Diamond Pricing
          </button>
          <button
            onClick={() => setActiveTab("duties")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "duties" 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350"
            }`}
          >
            Custom Duties
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1">
          {config && (
            <>
              {/* METALS PANEL */}
              {activeTab === "metals" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {config.metals.map((metal, idx) => {
                    const isGold = metal.name.toLowerCase() === "gold";
                    return (
                      <div 
                        key={metal.name} 
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold capitalize text-amber-600 dark:text-amber-500">
                            {metal.name}
                          </h3>
                          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full">
                            Base Metal
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                            Base Price per 10g (in ₹)
                          </label>
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-zinc-500 sm:text-sm">₹</span>
                            </div>
                            <input
                              type="number"
                              value={metal.basePricePer10g}
                              onChange={(e) => updateMetalPrice(idx, e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        </div>

                        {isGold && (
                          <div className="mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                              Purity Drop percentage per Carat Drop (%)
                            </label>
                            <span className="block text-[10px] text-zinc-400 mb-2 leading-relaxed">
                              Example: Set 5% drop. If quality drops by 4 carats (e.g. 24K to 20K), gold price drops by 20% (4 * 5%).
                            </span>
                            <div className="relative rounded-md shadow-sm">
                              <input
                                type="number"
                                value={metal.purityDropPercentPerCarat || 0}
                                onChange={(e) => updateGoldDrop(idx, e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 pr-7 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all text-sm font-medium"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-zinc-500 sm:text-sm">%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DIAMONDS PANEL */}
              {activeTab === "diamonds" && (
                <div className="flex flex-col gap-6">
                  {/* Diamond Base Price Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-amber-600 dark:text-amber-500 mb-4">Diamond Base Value</h3>
                    <div className="max-w-md">
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Base Price per Carat (in ₹)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-zinc-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          value={config.diamond.basePricePerCarat}
                          onChange={(e) => updateDiamondBase(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modifiers Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* DIAMOND MODIFIERS SUB-CARD RENDERER */}
                    {(["types", "shapes", "colors", "clarities"] as const).map((key) => {
                      const titleMapping = {
                        types: "Types (e.g. Lab grown, Natural)",
                        shapes: "Shapes (e.g. Round, Oval)",
                        colors: "Colors (e.g. D, E, F)",
                        clarities: "Clarity (e.g. FL, VVS1, VS2)"
                      };

                      return (
                        <div 
                          key={key} 
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                              {titleMapping[key]}
                            </h4>
                            <button
                              onClick={() => addModifier(key)}
                              className="text-xs flex items-center gap-1 text-amber-500 hover:text-amber-600 font-semibold cursor-pointer"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              Add
                            </button>
                          </div>

                          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                            {config.diamond[key].length === 0 ? (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2">No modifiers added yet.</p>
                            ) : (
                              config.diamond[key].map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={item.name}
                                    placeholder="Name (e.g. Round)"
                                    onChange={(e) => updateModifier(key, idx, "name", e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                  />
                                  <div className="relative w-28">
                                    <input
                                      type="number"
                                      value={item.percentageIncrease}
                                      placeholder="0"
                                      onChange={(e) => updateModifier(key, idx, "percentageIncrease", e.target.value)}
                                      className="w-full px-2 py-1.5 pr-6 text-xs bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-zinc-500">%</span>
                                  </div>
                                  <button
                                    onClick={() => removeModifier(key, idx)}
                                    className="text-zinc-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer"
                                    title="Delete modifier"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CUSTOM DUTIES PANEL */}
              {activeTab === "duties" && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-amber-600 dark:text-amber-500">Country Custom Duties</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure percentage rates applied per destination country</p>
                    </div>
                    <button
                      onClick={addDuty}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-500 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Country Custom Duty
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 max-w-2xl">
                    {config.customDuties.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 italic py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        No countries configured. Click the button above to add custom duty settings.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {config.customDuties.map((duty, idx) => (
                          <div key={idx} className="flex gap-4 items-center bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                            <input
                              type="text"
                              value={duty.country}
                              placeholder="Country Name (e.g. United States)"
                              onChange={(e) => updateDuty(idx, "country", e.target.value)}
                              className="flex-1 px-3 py-2 text-sm bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <div className="relative w-36">
                              <input
                                type="number"
                                value={duty.dutyPercentage}
                                placeholder="Duty Rate"
                                onChange={(e) => updateDuty(idx, "dutyPercentage", e.target.value)}
                                className="w-full px-3 py-2 pr-8 text-sm bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">%</span>
                            </div>
                            <button
                              onClick={() => removeDuty(idx)}
                              className="text-zinc-400 hover:text-rose-500 p-2 transition-colors cursor-pointer"
                              title="Remove country"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </main>
    </div>
  );
}
