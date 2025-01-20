// utils/parseZipData.ts
import JSZip from "jszip";

/**
 * Given a zip file (the .txt export), extract its text files and build
 * an object that mimics the JSON export structure.
 *
 * This version looks for a file that includes "profile info.txt" 
 * (case-insensitive) so that the processing function can extract 
 * the Username and Birthdate.
 */
interface ParsedZipData {
  Profile: {
    "Profile Info": string;
  };
  "Direct Messages": {
    "Chat History": {
      ChatHistory: string;
    };
  };
  "TikTok Shopping": {
    "Order History": string;
  };
  Activity: {
    "Login History": {
      LoginHistoryList: string;
    };
  };
}

export async function parseZipData(file: File): Promise<ParsedZipData> {
  const zip = await JSZip.loadAsync(file);
  const fileContents: Record<string, string> = {};

  // Read all files from the zip
  const filePromises = Object.keys(zip.files).map(async (filename) => {
    const fileObj = zip.files[filename];
    if (!fileObj.dir) {
      fileContents[filename] = await fileObj.async("text");
    }
  });
  await Promise.all(filePromises);

  // Try to find the Profile Info file even if path differs
  const profileInfoKey =
    Object.keys(fileContents).find((key) =>
      key.toLowerCase().includes("profile info.txt")
    ) || "";

  const profileInfo = profileInfoKey ? fileContents[profileInfoKey] : "";

  // Build a JSON-like structure from selected files.
  // NOTE: We now place the Order History text directly under 
  //       "TikTok Shopping" -> "Order History", as a string.
  const jsonData = {
    Profile: {
      "Profile Info": profileInfo,
    },
    "Direct Messages": {
      "Chat History": {
        ChatHistory:
          Object.keys(fileContents).find((key) =>
            key.toLowerCase().includes("direct messages.txt")
          )
            ? fileContents[
                Object.keys(fileContents).find((key) =>
                  key.toLowerCase().includes("direct messages.txt")
                )!
              ]
            : "",
      },
    },
    "TikTok Shopping": {
      "Order History":
        Object.keys(fileContents).find((key) =>
          key.toLowerCase().includes("order history.txt")
        )
          ? fileContents[
              Object.keys(fileContents).find((key) =>
                key.toLowerCase().includes("order history.txt")
              )!
            ]
          : "",
    },
    Activity: {
      "Login History": {
        LoginHistoryList:
          Object.keys(fileContents).find((key) =>
            key.toLowerCase().includes("login history.txt")
          )
            ? fileContents[
                Object.keys(fileContents).find((key) =>
                  key.toLowerCase().includes("login history.txt")
                )!
              ]
            : "",
      },
    },
  };

  return jsonData;
}
