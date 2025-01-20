"use client";

import { useState, useEffect } from "react";
import LZString from "lz-string";
import { getTikTokData } from "@/app/utils/dbHelpers";
import { processTikTokData, ProcessedTikTokData } from "@/app/utils/dataProcessing";

export interface StoredData extends ProcessedTikTokData {
  timestamp: number;
}

export default function useIndexedDBData(myUsername: string, reloadKey: string | number) {
  const [data, setData] = useState<StoredData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const stored = await getTikTokData(); // returns { data, timestamp } or null
        if (stored) {
          const decompressed = LZString.decompressFromUTF16(stored.data);
          if (!decompressed) throw new Error("Decompression failed");
          const jsonData = JSON.parse(decompressed);
          const processedData = processTikTokData(jsonData, myUsername);
          setData({ ...processedData, timestamp: stored.timestamp });
        } else {
          setData(null);
        }
      } catch {
        setError("Error loading stored data.");
      }
      setLoading(false);
    })();
  }, [myUsername, reloadKey]);

  return { data, error, loading };
}
