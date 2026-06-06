'use client'

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SellerLogin() {
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/seller/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Persist session locally
        if (typeof window !== "undefined") {
          localStorage.setItem("sellerSession", JSON.stringify(data.data));
        }
        // Redirect to admin products dashboard
        setTimeout(() => {
          router.push("/admin/products");
        }, 1000);
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 transition-colors duration-200">
      
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-400/10 dark:bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Form Card */}
      <div className="relative w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <Link href="/" className="inline-block mx-auto text-amber-500 hover:text-amber-600 font-extrabold text-2xl tracking-tight bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
            OCCUBIT JEWELRY
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-800 dark:text-zinc-155">Seller Portal Login</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Authenticate to manage your catalog</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Login successful! Entering dashboard...</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging In...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Redirect Footer */}
        <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-850 pt-4 flex flex-col gap-2">
          <span>
            Don&apos;t have an account?{" "}
            <Link href="/seller/signUp" className="text-amber-500 hover:underline font-bold transition-colors">
              Sign up here
            </Link>
          </span>
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-350 transition-colors flex items-center justify-center gap-1">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Catalog
          </Link>
        </div>

      </div>
    </div>
  );
}
