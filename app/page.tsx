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
  LineController, // Import LineController
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import LZString from "lz-string";

import Paper from "@mui/material/Paper";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import ClientHeader from "./components/ClientHeader";


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
  LineController,
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



/*
  useProcessData attempts to extract profile and other data.
  For the profile, it checks multiple possible structures:
   - a flat structure with keys "name" and "birthDate"
   - a nested structure under "Profile"
     that might have:
       • Profile Information → ProfileMap → userName / birthDate
       • or just "userName" / "birthDate" directly on Profile.
*/
const useProcessData = (myUsername: string) =>
  useCallback(
    (data: any) => {
      const profileData: ProfileData = {
        name:
          data?.name ||
          data?.Profile?.["Profile Information"]?.ProfileMap?.userName ||
          data?.Profile?.userName ||
          "Unknown",
        birthDate:
          data?.birthDate ||
          data?.Profile?.["Profile Information"]?.ProfileMap?.birthDate ||
          data?.Profile?.birthDate ||
          "Unknown",
      };

      console.log("Extracted profile data:", profileData);

      // Direct Messages
      const dmData =
        data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
      console.log("Raw DM Data:", dmData);

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
          dmSummaryObj[contact] =
            (dmSummaryObj[contact] || 0) + messages.length;
          messages.forEach((msg: any) => {
            if (msg.From && msg.From.toLowerCase() === myUsername) {
              sentMessagesList.push({ Contact: contact, Date: msg.Date });
            }
          });
        }
      });
      console.log("Processed DM Summary:", dmSummaryObj);
      console.log("Processed Sent Messages:", sentMessagesList);

      // Login History
      const loginData =
        data.Activity?.["Login History"]?.["LoginHistoryList"] || [];
      console.log("Raw Login Data:", loginData);

      // Shopping Data
      const shoppingData = data["Tiktok Shopping"];
      console.log("Raw Shopping Data:", shoppingData);

      return {
        profileData,
        dmData: { dmSummaryObj, sentMessagesList },
        loginData,
        shoppingData,
      };
    },
    [myUsername]
  );

export default function HomePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dmSummary, setDmSummary] = useState<DMSummary | null>(null);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [shoppingSummary, setShoppingSummary] =
    useState<ShoppingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [, setDataExists] = useState<boolean>(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [showConfirmationPopup, setShowConfirmationPopup] =
    useState<boolean>(false);
  // Store the full JSON export temporarily (for saving/restoring)
  const [tempJsonData, setTempJsonData] = useState<any>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);


  const myUsername = "joshuashunk".toLowerCase();
  const processData = useProcessData(myUsername);

  useEffect(() => {
    // Check if privacy notice has been shown before
    const noticeShown = localStorage.getItem("privacyNoticeShown");
    if (!noticeShown) {
      setShowPrivacyNotice(true);
    }
  }, []);

  const handlePrivacyNoticeClose = () => {
    localStorage.setItem("privacyNoticeShown", "true");
    setShowPrivacyNotice(false);
  };

  // Load stored data from IndexedDB on page load
  useEffect(() => {
    (async () => {
      const stored = await getTikTokData();
      if (stored) {
        console.log("Retrieved stored data:", stored);
        setDataExists(true);
        setShowRestoreModal(true);
        try {
          const decompressed = LZString.decompressFromUTF16(stored);
          if (!decompressed) throw new Error("Decompression failed");
          const jsonData = JSON.parse(decompressed);
          console.log("Parsed JSON data:", jsonData);
          const { profileData, dmData, loginData, shoppingData } =
            processData(jsonData);
          console.log("Processed profile data:", profileData);
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
        } catch (error) {
          console.error("Error processing stored data:", error);
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
            // Store the full JSON export for later saving/restoring
            setTempJsonData(jsonData);
            const { profileData, dmData, loginData, shoppingData } =
              processData(jsonData);
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
            setShowConfirmationPopup(true);
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

  // When the user confirms the upload, store the full JSON to IndexedDB
  const handleConfirmUpload = async () => {
    if (tempJsonData) {
      await setTikTokData(
        LZString.compressToUTF16(JSON.stringify(tempJsonData))
      );
    }
    setShowConfirmationPopup(false);
    setConfirmed(true);
  };

  const handleCancelUpload = () => {
    setProfile(null);
    setTempJsonData(null);
    setShowConfirmationPopup(false);
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
    const chartData: { labels: string[]; datasets: any[] } = {
      labels: [],
      datasets: [],
    };
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
    const contacts = Array.from(
      new Set(sentMessages.map((msg) => msg.Contact))
    );
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
  const columns: GridColDef[] = [
    {
      field: "contact",
      headerName: "Contact",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <span style={{ textTransform: "capitalize" }}>{params.value}</span>
      ),
    },
    {
      field: "sentMessages",
      headerName: "Messages Sent",
      type: "number",
      flex: 1,
    },
    {
      field: "receivedMessages",
      headerName: "Messages Received",
      type: "number",
      flex: 1,
    },
    {
      field: "totalMessages",
      headerName: "Total Messages",
      type: "number",
      flex: 1,
    },
  ];


const rows = dmSummary
  ? Object.keys(dmSummary).map((contact, index) => {
      const sentCount = sentMessages.filter(
        (msg) => msg.Contact === contact
      ).length;
      const receivedCount = dmSummary[contact] - sentCount;
      const totalMessages = sentCount + receivedCount;

      return {
        id: index,
        contact,
        sentMessages: sentCount,
        receivedMessages: receivedCount,
        totalMessages,
      };
    })
  : [];



  return (
    <>
      {/* Pass props to the ClientHeader */}
      <ClientHeader isConfirmed={confirmed} onClearData={handleClearData} />
      <div className="min-h-screen">
        {showRestoreModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50">
            <div className="backdrop-blur-lg bg-white bg-opacity-90 p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">
                Restore Previous Data
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                A previous upload for{" "}
                <strong>{profile?.name || "your profile"}</strong> was found
                locally. Would you like to restore this data or start fresh?
              </p>
              <div className="flex justify-center gap-6 mt-6">
                <button
                  onClick={() => {
                    setConfirmed(true); // Restore data
                    setShowRestoreModal(false);
                  }}
                  className="bg-pastel-green hover:bg-pastel-green-dark text-gray-800 px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105"
                >
                  Restore Data
                </button>
                <button
                  onClick={async () => {
                    await removeTikTokData(); // Clear stored data
                    setProfile(null);
                    setDmSummary(null);
                    setSentMessages([]);
                    setLoginHistory([]);
                    setShoppingSummary(null);
                    setDataExists(false);
                    setShowRestoreModal(false);
                  }}
                  className="bg-pastel-blue hover:bg-pastel-blue-dark text-gray-800 px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {showPrivacyNotice && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
              <h2 className="text-3xl font-semibold mb-4 text-gray-800">
                Notice of Privacy
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                All user data is securely stored locally on your computer. No
                data is uploaded or shared externally.
              </p>
              <button
                onClick={handlePrivacyNoticeClose}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-full font-medium shadow-md transition-transform transform hover:scale-105"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Popup */}
        {showConfirmationPopup && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Confirm Upload
              </h2>
              <p className="text-gray-600 mb-6">
                Please confirm the uploaded profile information:
              </p>
              <div className="text-left bg-gray-50 p-4 rounded-lg shadow-inner mb-6">
                <p className="text-gray-700 mb-2">
                  <strong>Name:</strong> {profile?.name || "Unknown"}
                </p>
                <p className="text-gray-700">
                  <strong>Birth Date:</strong> {profile?.birthDate || "Unknown"}
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleConfirmUpload}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium shadow-md transition-transform transform hover:scale-105"
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancelUpload}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium shadow-md transition-transform transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!confirmed ? (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
              <h2 className="text-3xl font-bold text-purple-800 mb-4">
                Upload Your TikTok Data
              </h2>
              <p className="text-gray-600 mb-6">
                Upload your TikTok JSON export to view your personalized Wrapped
                summary. Your data will remain private and stored locally on
                your device.
              </p>
              <label
                htmlFor="file-upload"
                className="block w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-3 px-4 rounded-lg cursor-pointer transition-all"
              >
                Select JSON File
                <input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {error && (
                <p className="text-red-500 mt-4 text-sm font-medium">{error}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 pb-8">
            <div className="relative mb-8 pt-8 w-full flex items-center justify-center">

              <h2 className="text-4xl font-bold">Your TikTok Wrapped</h2>
            </div>
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
                <h3 className="text-3xl font-semibold mb-4">
                  Shopping Summary
                </h3>
                <div className="flex flex-wrap gap-4 justify-center">
                  <div className="bg-green-200 p-6 rounded shadow flex-1 min-w-[200px] text-center">
                    <p className="text-xl font-semibold">Total Spending</p>
                    <p className="text-3xl">
                      ${shoppingSummary.totalSpending.toFixed(2)}
                    </p>
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
                <Paper sx={{ height: 400, width: "100%" }}>
                  <DataGrid
                    rows={rows}
                    columns={columns}
                    paginationModel={{ pageSize: rowsPerPage, page }}
                    onPaginationModelChange={(model) => {
                      setPage(model.page);
                      setRowsPerPage(model.pageSize);
                    }}
                    pageSizeOptions={[5, 10, 25]}
                    disableRowSelectionOnClick
                    sx={{ border: 0 }}
                  />
                </Paper>

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
    </>
  );
}
