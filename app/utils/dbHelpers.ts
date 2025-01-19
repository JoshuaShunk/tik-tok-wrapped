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

export async function getTikTokData(): Promise<string | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readonly");
    const store = transaction.objectStore("DataStore");
    const request = store.get("tikTokData");
    request.onsuccess = () => {
      resolve(request.result ? request.result.data : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setTikTokData(data: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readwrite");
    const store = transaction.objectStore("DataStore");
    const request = store.put({ id: "tikTokData", data });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove the stored TikTok data from IndexedDB.
 */
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

export async function fetchDataFromDB(
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<any | null> {
  try {
    const dataString = await getTikTokData();
    if (!dataString) return null;
    const decompressed = LZString.decompressFromUTF16(dataString);
    if (!decompressed) throw new Error("Decompression failed");
    return JSON.parse(decompressed);
  } catch {
    setError("Error reading data from IndexedDB.");
    return null;
  }
}
