/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import LZString from "lz-string";

// IndexedDB helpers
async function openDatabase(): Promise<IDBDatabase> {
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

async function getTikTokData(): Promise<string | null> {
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

async function setTikTokData(data: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readwrite");
    const store = transaction.objectStore("DataStore");
    const request = store.put({ id: "tikTokData", data });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function removeTikTokData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("DataStore", "readwrite");
    const store = transaction.objectStore("DataStore");
    const request = store.delete("tikTokData");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ProfileData {
  name: string;
  birthDate: string;
}

interface DMSummary {
  [contact: string]: number;
}

interface SentMessage {
  Contact: string;
  Date: string;
}

interface LoginHistory {
  Date: string;
}

interface ShoppingSummary {
  totalSpending: number;
  totalOrders: number;
}

const useProcessData = (myUsername: string) =>
  useCallback((data: any) => {
    const profileData: ProfileData = {
      name:
        data.Profile?.["Profile Information"]?.ProfileMap?.userName ||
        "Unknown",
      birthDate:
        data.Profile?.["Profile Information"]?.ProfileMap?.birthDate ||
        "Unknown",
    };
    return {
      profileData,
      dmData: (() => {
        const dmData = data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
        const dmSummaryObj: DMSummary = {};
        const sentMessagesList: SentMessage[] = [];
        Object.keys(dmData).forEach((threadName: string) => {
          const contact = threadName
            .replace("Chat History with", "")
            .replace(":", "")
            .trim()
            .toLowerCase();
          const messages = dmData[threadName];
          if (Array.isArray(messages)) {
            dmSummaryObj[contact] = (dmSummaryObj[contact] || 0) + messages.length;
            messages.forEach((msg: any) => {
              if (msg.From && msg.From.toLowerCase() === myUsername) {
                sentMessagesList.push({ Contact: contact, Date: msg.Date });
              }
            });
          }
        });
        return { dmSummaryObj, sentMessagesList };
      })(),
      loginData: data.Activity?.["Login History"]?.["LoginHistoryList"] || [],
      shoppingData: data["Tiktok Shopping"],
    };
  }, [myUsername]);

export default function HomePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dmSummary, setDmSummary] = useState<DMSummary | null>(null);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [shoppingSummary, setShoppingSummary] = useState<ShoppingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [dataExists, setDataExists] = useState<boolean>(false);

  const myUsername = "joshuashunk".toLowerCase();
  const processData = useProcessData(myUsername);

  useEffect(() => {
    (async () => {
      const stored = await getTikTokData();
      if (stored) {
        setDataExists(true);
        try {
          const decompressed = LZString.decompressFromUTF16(stored);
          if (!decompressed) throw new Error("Decompression failed");
          const jsonData = JSON.parse(decompressed);
          const { profileData, dmData, loginData, shoppingData } = processData(jsonData);
          setProfile(profileData);
          setDmSummary(dmData.dmSummaryObj);
          setSentMessages(dmData.sentMessagesList);
          const loginList: LoginHistory[] = loginData.map((login: any) => ({
            Date: login.Date || "Unknown",
          }));
          setLoginHistory(loginList);
          if (shoppingData) {
            const orderHistories =
              shoppingData["Order History"]?.["OrderHistories"] || {};
            let totalSpending = 0;
            let totalOrders = 0;
            Object.keys(orderHistories).forEach((orderId) => {
              const order = orderHistories[orderId];
              const totalPriceStr = order.total_price || "0 USD";
              const totalPrice = parseFloat(totalPriceStr.split(" ")[0]) || 0;
              totalSpending += totalPrice;
              totalOrders += 1;
            });
            setShoppingSummary({ totalSpending, totalOrders });
          }
        } catch {
          // ignore errors
        }
      }
    })();
  }, [processData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        if (result && typeof result === "string") {
          try {
            const jsonData = JSON.parse(result);
            const { profileData, dmData, loginData, shoppingData } = processData(jsonData);
            setProfile(profileData);
            setDmSummary(dmData.dmSummaryObj);
            setSentMessages(dmData.sentMessagesList);
            const loginList: LoginHistory[] = loginData.map((login: any) => ({
              Date: login.Date || "Unknown",
            }));
            setLoginHistory(loginList);
            if (shoppingData) {
              const orderHistories =
                shoppingData["Order History"]?.["OrderHistories"] || {};
              let totalSpending = 0;
              let totalOrders = 0;
              Object.keys(orderHistories).forEach((orderId) => {
                const order = orderHistories[orderId];
                const totalPriceStr = order.total_price || "0 USD";
                const totalPrice = parseFloat(totalPriceStr.split(" ")[0]) || 0;
                totalSpending += totalPrice;
                totalOrders += 1;
              });
              setShoppingSummary({ totalSpending, totalOrders });
            }
            await setTikTokData(LZString.compressToUTF16(JSON.stringify(jsonData)));
            setDataExists(true);
          } catch {
            setError("Invalid JSON file");
          }
        } else {
          setError("Could not read file content as text.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirm = () => {
    if (profile) {
      setConfirmed(true);
    }
  };

  const handleClearData = async () => {
    await removeTikTokData();
    setProfile(null);
    setDmSummary(null);
    setSentMessages([]);
    setLoginHistory([]);
    setShoppingSummary(null);
    setConfirmed(false);
    setDataExists(false);
  };

  const prepareChartData = (): { labels: string[]; datasets: any[] } => {
    const chartData: { labels: string[]; datasets: any[] } = { labels: [], datasets: [] };
    const grouped: Record<string, Record<string, number>> = {};
    sentMessages.forEach((msg) => {
      const date = new Date(msg.Date);
      const month = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      if (!grouped[month]) grouped[month] = {};
      if (!grouped[month][msg.Contact]) grouped[month][msg.Contact] = 0;
      grouped[month][msg.Contact] += 1;
    });
    const months = Object.keys(grouped).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    chartData.labels = months;
    const contacts = Array.from(new Set(sentMessages.map((msg) => msg.Contact)));
    contacts.forEach((contact) => {
      chartData.datasets.push({
        label: contact,
        data: months.map((month) => grouped[month][contact] || 0),
        fill: false,
        borderColor: getRandomColor(),
        tension: 0.1,
      });
    });
    return chartData;
  };

  const getRandomColor = (): string => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const prepareLoginChartData = (): { labels: string[]; datasets: any[] } => {
    const grouped: Record<string, number> = {};
    loginHistory.forEach((login) => {
      const date = new Date(login.Date);
      const month = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      if (!grouped[month]) grouped[month] = 0;
      grouped[month] += 1;
    });
    const months = Object.keys(grouped).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    return {
      labels: months,
      datasets: [
        {
          label: "Total Logins",
          data: months.map((m) => grouped[m]),
          fill: false,
          borderColor: "#4F46E5",
          tension: 0.1,
        },
      ],
    };
  };

  return (
    <div className="min-h-screen">
      {!confirmed ? (
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">TikTok Wrapped</h2>
          <p className="mb-6 text-xl text-gray-600">
            Upload your TikTok JSON export to view your personal wrapped summary.
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block mx-auto border border-gray-300 p-3 rounded w-full max-w-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {dataExists && (
            <div className="mt-4">
              <p className="text-xl text-green-700">Data already uploaded.</p>
              <button
                onClick={handleClearData}
                className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Upload New File
              </button>
            </div>
          )}
          {profile && (
            <div className="mt-6 p-6 bg-gray-50 rounded">
              <h3 className="text-3xl font-semibold mb-4 text-gray-700">
                Confirm Your Profile
              </h3>
              <p className="text-xl mb-2">
                <strong>Name:</strong> {profile.name}
              </p>
              <p className="text-xl mb-4">
                <strong>Birth Date:</strong> {profile.birthDate}
              </p>
              <button
                onClick={handleConfirm}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded transition"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 pb-8">
          <div className="flex justify-between items-center mb-8">
            <button onClick={handleClearData} className="text-red-600 hover:underline">
              Upload New File
            </button>
            <Link href="/" className="text-blue-600 hover:underline">
              Dashboard
            </Link>
          </div>
          <h2 className="text-4xl font-bold mb-8 text-center">Your TikTok Wrapped</h2>

          {profile && (
            <section className="mb-8">
              <h3 className="text-3xl font-semibold mb-4">Profile</h3>
              <p className="text-xl">
                <strong>Name:</strong> {profile.name}
              </p>
              <p className="text-xl">
                <strong>Birth Date:</strong> {profile.birthDate}
              </p>
            </section>
          )}

          {dmSummary && (
            <section className="mb-8">
              <h3 className="text-3xl font-semibold mb-4">
                Direct Messages Summary
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-b text-left">Contact</th>
                    <th className="py-3 px-4 border-b text-left">Messages Exchanged</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(dmSummary).map((contact) => (
                    <tr key={contact} className="hover:bg-gray-100">
                      <td className="py-3 px-4 border-b capitalize">{contact}</td>
                      <td className="py-3 px-4 border-b">{dmSummary[contact]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {sentMessages.length > 0 && (
            <section className="mb-8">
              <h3 className="text-3xl font-semibold mb-4">
                Messages Sent Per Person Per Month
              </h3>
              <Chart
                type="line"
                data={prepareChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "top" as const },
                    title: { display: true, text: "Sent Messages Over Time" },
                  },
                }}
              />
            </section>
          )}

          {loginHistory.length > 0 && (
            <section className="mb-8">
              <h3 className="text-3xl font-semibold mb-4">Login Overview</h3>
              <Chart
                type="line"
                data={prepareLoginChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "top" as const },
                    title: { display: true, text: "Logins by Month" },
                  },
                }}
              />
              <p className="mt-4 text-center text-xl font-semibold">
                Total Logins: {loginHistory.length}
              </p>
            </section>
          )}

          {shoppingSummary && (
            <section className="mb-8">
              <h3 className="text-3xl font-semibold mb-4">Shopping Summary</h3>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="bg-green-200 p-6 rounded shadow flex-1 min-w-[200px] text-center">
                  <p className="text-xl font-semibold">Total Spending</p>
                  <p className="text-3xl">${shoppingSummary.totalSpending.toFixed(2)}</p>
                </div>
                <div className="bg-blue-200 p-6 rounded shadow flex-1 min-w-[200px] text-center">
                  <p className="text-xl font-semibold">Total Orders</p>
                  <p className="text-3xl">{shoppingSummary.totalOrders}</p>
                </div>
              </div>
            </section>
          )}

          {dmSummary && (
            <section className="mb-8">
              <h3 className="text-3xl font-semibold mb-4">Top Friends</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-b text-left">Contact</th>
                    <th className="py-3 px-4 border-b text-left">Messages Sent</th>
                    <th className="py-3 px-4 border-b text-left">Messages Received</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(dmSummary)
                    .sort((a, b) => dmSummary[b] - dmSummary[a])
                    .slice(0, 5)
                    .map((contact) => {
                      const sentCount = sentMessages.filter(
                        (msg) => msg.Contact === contact
                      ).length;
                      return (
                        <tr key={contact} className="hover:bg-gray-100">
                          <td className="py-3 px-4 border-b capitalize">{contact}</td>
                          <td className="py-3 px-4 border-b">{sentCount}</td>
                          <td className="py-3 px-4 border-b">
                            {dmSummary[contact] - sentCount}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div className="mt-6 text-center">
                <Link href="/chat" className="text-blue-600 hover:underline">
                  Go to Chat View &rarr;
                </Link>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
