// components/FileUploader.tsx
"use client";

import React, { useState } from "react";
import LZString from "lz-string";
import {
  processTikTokData,
  ProcessedTikTokData,
  RawTikTokData,
  ProfileData,
} from "@/app/utils/dataProcessing";
import { setTikTokData } from "@/app/utils/dbHelpers";

interface FileUploaderProps {
  myUsername: string;
  onDataProcessed: (data: ProcessedTikTokData) => void;
}

export default function FileUploader({
  myUsername,
  onDataProcessed,
}: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [showConfirmationPopup, setShowConfirmationPopup] =
    useState<boolean>(false);
  const [tempJsonData, setTempJsonData] = useState<RawTikTokData | null>(null);
  const [profilePreview, setProfilePreview] = useState<ProfileData | null>(
    null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        if (result && typeof result === "string") {
          try {
            const jsonData = JSON.parse(result) as RawTikTokData;
            setTempJsonData(jsonData);
            const { profileData, dmData, loginData, shoppingData } =
              processTikTokData(jsonData, myUsername);
            setProfilePreview(profileData); // Show preview info for confirmation
            onDataProcessed({ profileData, dmData, loginData, shoppingData });
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
  };

  const handleCancelUpload = () => {
    setShowConfirmationPopup(false);
    setTempJsonData(null);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
        <h2 className="text-3xl font-bold text-purple-800 mb-4">
          Upload Your TikTok Data
        </h2>
        <p className="text-gray-600 mb-6">
          Upload your TikTok JSON export. Your data will remain private and
          stored locally.
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
                <strong>Name:</strong> {profilePreview?.name || "Unknown"}
              </p>
              <p className="text-gray-700">
                <strong>Birth Date:</strong>{" "}
                {profilePreview?.birthDate || "Unknown"}
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
    </>
  );
}
