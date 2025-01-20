/* eslint-disable @typescript-eslint/no-explicit-any */
import LZString from "lz-string";

export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("tikTokDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("DataStore")) {
        db.createObjectStore("DataStore", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface TikTokDataItem {
  id: string;
  data: string;
  timestamp: number;
}

export async function getTikTokData(): Promise<TikTokDataItem | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readonly");
    const store = transaction.objectStore("DataStore");
    const request = store.get("tikTokData");
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setTikTokData(data: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readwrite");
    const store = transaction.objectStore("DataStore");
    // Save the compressed JSON data along with a timestamp:
    const item: TikTokDataItem = { id: "tikTokData", data, timestamp: Date.now() };
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeTikTokData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readwrite");
    const store = transaction.objectStore("DataStore");
    const request = store.delete("tikTokData");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Utility to read the stored data from IndexedDB.
 */
export async function fetchDataFromDB(
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<any | null> {
  try {
    const item = await getTikTokData();
    if (!item) return null;
    const decompressed = LZString.decompressFromUTF16(item.data);
    if (!decompressed) throw new Error("Decompression failed");
    return JSON.parse(decompressed);
  } catch {
    setError("Error reading data from IndexedDB.");
    return null;
  }
}
