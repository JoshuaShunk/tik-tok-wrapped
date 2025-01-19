"use client";

import React, { useState, useEffect } from "react";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import LZString from "lz-string";
import Paper from "@mui/material/Paper";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import ClientHeader from "./components/ClientHeader";

import {
  getTikTokData,
  setTikTokData,
  removeTikTokData,
} from "@/app/utils/dbHelpers";
import {
  processTikTokData,
  ProcessedTikTokData,
  ProfileData,
  LoginHistory,
  SentMessage,
} from "@/app/utils/dataProcessing";
import {
  prepareChartData,
  prepareLoginChartData,
} from "@/app/utils/chatUtils";
import useIndexedDBData from "@/app/hooks/useIndexedDBData";

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

export default function HomePage() {
  // Local state for data that is manually processed from a file upload.
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dmSummary, setDmSummary] = useState<Record<string, number> | null>(
    null
  );
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [shoppingSummary, setShoppingSummary] = useState<{
    totalSpending: number;
    totalOrders: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);
  const [showConfirmationPopup, setShowConfirmationPopup] =
    useState<boolean>(false);
  const [tempJsonData, setTempJsonData] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // A reloadKey used to force the indexedDB hook to re-read the stored data.
  const [reloadKey, setReloadKey] = useState<number>(0);

  const myUsername = "joshuashunk".toLowerCase();

  // Use our custom hook to load stored data from IndexedDB.
  const { data: storedData, error: dbError } = useIndexedDBData(
    myUsername,
    reloadKey
  );

  // When stored data changes, update the local UI state.
  useEffect(() => {
    if (storedData) {
      setProfile(storedData.profileData);
      setDmSummary(storedData.dmData.dmSummaryObj);
      setSentMessages(storedData.dmData.sentMessagesList);
      const loginList: LoginHistory[] = storedData.loginData.map(
        (login: any) => ({
          Date: login.Date || "Unknown",
        })
      );
      setLoginHistory(loginList);
      if (storedData.shoppingData) {
        const orderHistories =
          storedData.shoppingData["Order History"]?.["OrderHistories"] || {};
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
      // Automatically mark as confirmed if stored data exists.
      setConfirmed(true);
    }
  }, [storedData]);

  // Check if the privacy notice has been shown.
  useEffect(() => {
    const noticeShown = localStorage.getItem("privacyNoticeShown");
    if (!noticeShown) {
      setShowPrivacyNotice(true);
    }
  }, []);

  const handlePrivacyNoticeClose = () => {
    localStorage.setItem("privacyNoticeShown", "true");
    setShowPrivacyNotice(false);
  };

  // File upload handler.
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
            // Since we want to upload a new file, clear any previous stored data.
            await removeTikTokData();
            setReloadKey((prev) => prev + 1);
            setTempJsonData(jsonData);
            const { profileData, dmData, loginData, shoppingData } =
              processTikTokData(jsonData, myUsername);
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

  // Confirm the file upload and store the raw JSON into IndexedDB.
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

  // Called from the restore modal "Start Fresh" button.
  const handleStartFresh = async () => {
    await removeTikTokData();
    setReloadKey((prev) => prev + 1);
    setProfile(null);
    setDmSummary(null);
    setSentMessages([]);
    setLoginHistory([]);
    setShoppingSummary(null);
    setConfirmed(false);
  };

  // Prepare DataGrid columns.
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
      <ClientHeader isConfirmed={confirmed} onClearData={handleStartFresh} />
      <div className="min-h-screen">
        {/* Restore Modal – only shown if stored data exists and the file upload process is not already confirmed */}
        {storedData && !confirmed && (
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
                    setConfirmed(true);
                  }}
                  className="bg-pastel-green hover:bg-pastel-green-dark text-gray-800 px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105"
                >
                  Restore Data
                </button>
                <button
                  onClick={handleStartFresh}
                  className="bg-pastel-blue hover:bg-pastel-blue-dark text-gray-800 px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
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

        {/* Confirmation Popup for File Upload */}
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

        {/* If data is not confirmed (i.e. no stored data or file upload completed), show File Upload UI */}
        {!confirmed && (
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
        )}

        {/* Main Content – Display charts and tables once data is confirmed */}
        {confirmed && (
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
                  data={prepareChartData(sentMessages)}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: "top" },
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
                  data={prepareLoginChartData(loginHistory)}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: "top" },
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
