/* utils/dataProcessing.ts */
export interface ProfileData {
  name: string;
  birthDate: string;
}

export interface DMSummary {
  [contact: string]: number;
}

export interface SentMessage {
  Contact: string;
  Date: string;
}

export interface LoginHistory {
  Date: string;
}

export interface ShoppingSummary {
  totalSpending: number;
  totalOrders: number;
}

export interface ProcessedTikTokData {
  profileData: ProfileData;
  dmData: {
    dmSummaryObj: DMSummary;
    sentMessagesList: SentMessage[];
  };
  loginData: any[];
  shoppingData: any;
}

/**
 * Processes the raw TikTok export JSON and extracts key information.
 * It checks multiple potential data structures for profile information.
 */
export function processTikTokData(
  data: any,
  myUsername: string
): ProcessedTikTokData {
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

  // Process Direct Messages
  const dmDataRaw = data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
  const dmSummaryObj: DMSummary = {};
  const sentMessagesList: SentMessage[] = [];

  Object.keys(dmDataRaw).forEach((threadName: string) => {
    const contact = threadName
      .replace("Chat History with", "")
      .replace(":", "")
      .trim()
      .toLowerCase();

    const messages = dmDataRaw[threadName];
    if (Array.isArray(messages)) {
      dmSummaryObj[contact] = (dmSummaryObj[contact] || 0) + messages.length;
      messages.forEach((msg: any) => {
        if (msg.From && msg.From.toLowerCase() === myUsername) {
          sentMessagesList.push({ Contact: contact, Date: msg.Date });
        }
      });
    }
  });

  // Process Login History
  const loginData = data.Activity?.["Login History"]?.["LoginHistoryList"] || [];

  // Pass shoppingData along untouched (can be processed later)
  const shoppingData = data["Tiktok Shopping"];

  return {
    profileData,
    dmData: { dmSummaryObj, sentMessagesList },
    loginData,
    shoppingData,
  };
}
