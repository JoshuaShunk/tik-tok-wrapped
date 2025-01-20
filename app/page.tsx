// app/page.tsx
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
  ProfileData,
  LoginHistory,
  SentMessage,
  ShoppingSummary,
} from "@/app/utils/dataProcessing";
import { prepareChartData, prepareLoginChartData } from "@/app/utils/chatUtils";
import useIndexedDBData from "@/app/hooks/useIndexedDBData";
import { parseZipData } from "@/app/utils/parseZipData";
import SummaryCards from "./components/SummaryCards"; // <-- Our fancy new component

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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dmSummary, setDmSummary] = useState<Record<string, number> | null>(
    null
  );
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [shoppingSummary, setShoppingSummary] =
    useState<ShoppingSummary | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [showConfirmationPopup, setShowConfirmationPopup] =
    useState<boolean>(false);
  const [tempJsonData, setTempJsonData] = useState<any>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // NEW: controls whether we show the Summary Cards overlay
  const [showSummaryCards, setShowSummaryCards] = useState<boolean>(false);

  const myUsername = "joshuashunk".toLowerCase();
  const FRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

  // Load stored data from IndexedDB
  const {
    data: storedData,
    loading,
  } = useIndexedDBData(myUsername, reloadKey);

  useEffect(() => {
    if (storedData) {
      const isFresh = Date.now() - storedData.timestamp < FRESH_THRESHOLD;
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
        setShoppingSummary(storedData.shoppingData);
      }
      setConfirmed(isFresh);
    }
  }, [storedData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".zip") || file.type === "application/zip") {
      // ZIP file
      parseZipData(file)
        .then((jsonData) => {
          removeTikTokData().then(() => {
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
              setShoppingSummary(shoppingData);
            }
            setShowConfirmationPopup(true);
          });
        })
        .catch(() => {
          setError("Error processing ZIP file.");
        });
    } else {
      // JSON file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        if (result && typeof result === "string") {
          try {
            const jsonData = JSON.parse(result);
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
              setShoppingSummary(shoppingData);
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

  // DM table columns
  const dmColumns: GridColDef[] = [
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

  const dmRows = dmSummary
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

  // Shopping items table
  const shoppingColumns: GridColDef[] = [
    { field: "orderId", headerName: "Order ID", flex: 1, minWidth: 200 },
    { field: "orderDate", headerName: "Order Date", flex: 1, minWidth: 150 },
    {
      field: "productName",
      headerName: "Product Name",
      flex: 1,
      minWidth: 200,
    },
    { field: "variationName", headerName: "Variation", flex: 1, minWidth: 120 },
    { field: "quantity", headerName: "Qty", type: "number", flex: 0.5 },
    {
      field: "totalPrice",
      headerName: "Total Price (USD)",
      type: "number",
      flex: 1,
    },
    { field: "orderStatus", headerName: "Status", flex: 1, minWidth: 100 },
  ];

  const shoppingRows =
    shoppingSummary?.purchasedItems?.map((item, index) => ({
      id: index,
      orderId: item.orderId,
      orderDate: item.orderDate,
      productName: item.productName,
      variationName: item.variationName,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      orderStatus: item.orderStatus,
    })) || [];

  return (
    <>
      <ClientHeader isConfirmed={confirmed} onClearData={handleStartFresh} />
      <div className="min-h-screen">
        {loading && (
          <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-xl font-semibold">Loading stored data...</div>
          </div>
        )}

        {/* If older data is found but not "fresh," prompt user */}
        {!loading &&
          storedData &&
          !confirmed &&
          Date.now() - storedData.timestamp >= FRESH_THRESHOLD && (
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
                    onClick={() => setConfirmed(true)}
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

        {/* Upload prompt */}
        {!loading && !confirmed && (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
              <h2 className="text-3xl font-bold text-purple-800 mb-4">
                Upload Your TikTok Data
              </h2>
              <p className="text-gray-600 mb-6">
                Upload your TikTok export (JSON or ZIP) to view your
                personalized Wrapped summary. Your data will remain private and
                stored locally on your device.
              </p>
              <label
                htmlFor="file-upload"
                className="block w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-3 px-4 rounded-lg cursor-pointer transition-all"
              >
                Select File
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,.zip"
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

        {/* Main dashboard */}
        {!loading && confirmed && (
          <div className="px-4 md:px-8 pb-8">
            {/* Title & "View Summary Cards" button */}
            <div className="relative mb-8 pt-8 w-full flex items-center justify-between">
              <h2 className="text-4xl font-bold">Your TikTok Wrapped</h2>
              <button
                onClick={() => setShowSummaryCards(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-3 rounded-full shadow-md hover:opacity-90 transition"
              >
                View Summary Cards
              </button>
            </div>

            {/* 2-col grid for Profile & Shopping */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Profile Card */}
              {profile && (
                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-2xl font-semibold mb-4">Profile</h3>
                  <p className="text-lg">
                    <strong>Name:</strong> {profile.name}
                  </p>
                  <p className="text-lg">
                    <strong>Birth Date:</strong> {profile.birthDate}
                  </p>
                </section>
              )}

              {/* Shopping Summary Card */}
              {shoppingSummary && (
                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-2xl font-semibold mb-4">
                    Shopping Summary
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-start mb-4">
                    <div className="bg-green-200 p-4 rounded shadow flex-1 min-w-[150px] text-center">
                      <p className="text-lg font-semibold">Total Spending</p>
                      <p className="text-2xl">
                        ${shoppingSummary.totalSpending.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-blue-200 p-4 rounded shadow flex-1 min-w-[150px] text-center">
                      <p className="text-lg font-semibold">Total Orders</p>
                      <p className="text-2xl">{shoppingSummary.totalOrders}</p>
                    </div>
                  </div>

                  {/* Purchased Items Table */}
                  {shoppingSummary.purchasedItems?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xl font-medium mb-2">
                        Purchased Items
                      </h4>
                      <Paper sx={{ height: 300, width: "100%" }}>
                        <DataGrid
                          rows={shoppingRows}
                          columns={shoppingColumns}
                          pageSizeOptions={[5, 10, 25]}
                          paginationModel={{ pageSize: 5, page: 0 }}
                          disableRowSelectionOnClick
                          sx={{ border: 0 }}
                        />
                      </Paper>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* 2-col grid for charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sent Messages Chart */}
              {sentMessages.length > 0 && (
                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-2xl font-semibold mb-4">
                    Messages Sent Per Month
                  </h3>
                  <Chart
                    type="line"
                    data={prepareChartData(sentMessages)}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: "top" },
                        title: {
                          display: true,
                          text: "Sent Messages Over Time",
                        },
                      },
                    }}
                  />
                </section>
              )}

              {/* Login History Chart */}
              {loginHistory.length > 0 && (
                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-2xl font-semibold mb-4">
                    Login Overview
                  </h3>
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
                  <p className="mt-4 text-center text-lg font-semibold">
                    Total Logins: {loginHistory.length}
                  </p>
                </section>
              )}
            </div>

            {/* Top Friends Table */}
            {dmSummary && (
              <section className="mt-8 bg-white rounded-lg shadow p-4">
                <h3 className="text-2xl font-semibold mb-4">Top Friends</h3>
                <Paper sx={{ height: 400, width: "100%" }}>
                  <DataGrid
                    rows={dmRows}
                    columns={dmColumns}
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

        {/* Confirmation popup */}
        {!loading && showConfirmationPopup && (
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

        {/* The new Summary Cards overlay (only shows if showSummaryCards = true) */}
        {showSummaryCards && (
          <SummaryCards
            profile={profile}
            dmSummary={dmSummary}
            sentMessages={sentMessages}
            loginHistory={loginHistory}
            shoppingSummary={shoppingSummary}
            onClose={() => setShowSummaryCards(false)}
          />
        )}
      </div>
    </>
  );
}
