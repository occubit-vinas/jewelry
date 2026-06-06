'use client'
import Image from "next/image";
import { useEffect } from "react";
import { useUserStore } from "@/lib/store";

export default function Home() {
  const { collectionsInfo, loading, error, fetchCollections } = useUserStore();

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);
//   useEffect(() => {
//   async function getUsers() {
//     const res = await fetch("/api/user");
//     const data = await res.json();

//     console.log(data);
//   }

//   getUsers();
// }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black p-6">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-12 px-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-md sm:items-start gap-8">
        
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="w-full">
          <h1 className="text-2xl font-bold mb-4 text-black dark:text-zinc-50">
            Database Collections Info (Zustand Store)
          </h1>

          {loading && <p className="text-zinc-500">Loading collection info...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}

          {!loading && !error && collectionsInfo && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  Collection Names:
                </h2>
                <ul className="list-disc list-inside mt-2 text-zinc-600 dark:text-zinc-400">
                  {collectionsInfo.collectionNames?.map((name: string) => (
                    <li key={name} className="font-mono">{name}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  Raw API Data:
                </h2>
                <pre className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-x-auto text-xs font-mono text-zinc-800 dark:text-zinc-200">
                  {JSON.stringify(collectionsInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
