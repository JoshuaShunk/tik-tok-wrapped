"use client";

import { useState, useEffect } from "react";
import LZString from "lz-string";
import { getTikTokData } from "@/app/utils/dbHelpers";
import { processTikTokData, ProcessedTikTokData } from "@/app/utils/dataProcessing";

/**
 * Custom hook to load processed TikTok data from IndexedDB.
 * Accepts a `reloadKey` so that changes (e.g. after clearing the data)
 * trigger a re-read from the database.
 */
export default function useIndexedDBData(myUsername: string, reloadKey: any) {
  const [data, setData] = useState<ProcessedTikTokData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedData = await getTikTokData();
        if (storedData) {
          const decompressed = LZString.decompressFromUTF16(storedData);
          if (!decompressed) throw new Error("Decompression failed");
          const jsonData = JSON.parse(decompressed);
          const processedData = processTikTokData(jsonData, myUsername);
          setData(processedData);
        } else {
          setData(null);
        }
      } catch (err) {
        setError("Error loading stored data.");
      }
    })();
  }, [myUsername, reloadKey]);

  return { data, error };
}
