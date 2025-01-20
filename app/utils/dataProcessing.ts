// utils/dataProcessing.ts

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

export interface ChatMessage {
  date: string;
  sender: string;
  message: string;
}

export interface LoginHistory {
  Date: string;
}

export interface ShoppingItem {
  orderId: string;
  orderDate: string;
  productName: string;
  variationName: string;
  quantity: number;
  totalPrice: number;    // entire order's total in a naive approach
  orderStatus: string;
}

export interface ShoppingSummary {
  totalSpending: number;
  totalOrders: number;
  purchasedItems: ShoppingItem[];
}

export interface ProcessedTikTokData {
  profileData: ProfileData;
  dmData: {
    dmSummaryObj: DMSummary;
    sentMessagesList: SentMessage[];
    chatMessages: Record<string, ChatMessage[]>;
  };
  loginData: any[];
  shoppingData: ShoppingSummary;
}

export function parseShoppingTxt(shoppingText: string): ShoppingSummary {
  console.log("[parseShoppingTxt] Raw Shopping Text:", shoppingText);

  // We'll collect multiple orders if present
  const orders: {
    orderId: string;
    orderDate: string;
    orderStatus: string;
    totalPrice: number;
    products: Array<{
      productName: string;
      variationName: string;
      quantity: number;
    }>;
  }[] = [];

  // A temporary holder for the current order we are parsing
  let currentOrder: {
    orderId: string;
    orderDate: string;
    orderStatus: string;
    totalPrice: number;
    products: Array<{
      productName: string;
      variationName: string;
      quantity: number;
    }>;
  } | null = null;

  // For building product info
  let currentProduct: Partial<{
    productName: string;
    variationName: string;
    quantity: number;
  }> = {};

  // Split all lines
  const lines = shoppingText.split("\n").map((l) => l.trim());

  const pushCurrentOrderIfValid = () => {
    if (currentOrder && currentOrder.orderId) {
      // If there's at least an orderId, we consider it a valid order
      orders.push(currentOrder);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // If we detect a new "Order date:" and we already have an active order, 
    // push it and start a new one
    if (line.startsWith("Order date:")) {
      if (currentOrder) {
        // push the previous one
        pushCurrentOrderIfValid();
      }
      // start new order
      currentOrder = {
        orderId: "",
        orderDate: line.replace("Order date:", "").trim(),
        orderStatus: "",
        totalPrice: 0,
        products: [],
      };
      continue;
    }

    if (line.startsWith("Order number:")) {
      // If we see an order number but currentOrder is not null and already has an orderId, 
      // that might indicate a new order. This is naive, but let's handle it.
      if (currentOrder && currentOrder.orderId) {
        // push the old one, start fresh
        pushCurrentOrderIfValid();
        currentOrder = {
          orderId: "",
          orderDate: "",
          orderStatus: "",
          totalPrice: 0,
          products: [],
        };
      } else if (!currentOrder) {
        // in case lines appear in a different order
        currentOrder = {
          orderId: "",
          orderDate: "",
          orderStatus: "",
          totalPrice: 0,
          products: [],
        };
      }
      currentOrder.orderId = line.replace("Order number:", "").trim();
      continue;
    }

    if (line.startsWith("Order status:") && currentOrder) {
      currentOrder.orderStatus = line.replace("Order status:", "").trim();
      continue;
    }

    // Example: "Total price (including shipping fee): 10.68 USD"
    if (line.toLowerCase().startsWith("total price") && currentOrder) {
      const match = line.match(/:\s*([0-9.]+)\s*USD/i);
      if (match) {
        currentOrder.totalPrice = parseFloat(match[1]);
      }
      continue;
    }

    // Product lines:
    //   >>Name:
    //   Schylling ...
    //   Default
    //   >>Quantity: 1
    if (line.startsWith(">>Name:")) {
      // Next line(s) might hold productName / variation
      // We'll do a naive approach again:
      const nameLine = lines[i + 1] || "";
      // Variation might be lines[i + 2], but watch for ">>Quantity:"
      const possibleVariationLine = lines[i + 2] || "";

      currentProduct = { productName: nameLine.trim(), variationName: "Unknown", quantity: 1 };

      // If the possibleVariationLine doesn't start with >>, assume it's the variation
      if (
        possibleVariationLine &&
        !possibleVariationLine.startsWith(">>") &&
        !possibleVariationLine.toLowerCase().includes("order date:") &&
        !possibleVariationLine.toLowerCase().includes("order number:")
      ) {
        currentProduct.variationName = possibleVariationLine.trim();
      }
      continue;
    }

    if (line.startsWith(">>Quantity:") && currentOrder) {
      if (!currentProduct.productName) {
        currentProduct.productName = "Unknown";
      }
      const qtyStr = line.replace(">>Quantity:", "").trim();
      const qty = parseInt(qtyStr, 10);
      currentProduct.quantity = isNaN(qty) ? 1 : qty;

      // Add it to the current order's product list
      currentOrder.products.push({
        productName: currentProduct.productName,
        variationName: currentProduct.variationName || "Unknown",
        quantity: currentProduct.quantity,
      });

      // Reset for next potential item
      currentProduct = {};
      continue;
    }
  }

  // After finishing lines, push the last order
  pushCurrentOrderIfValid();

  // Now convert orders into ShoppingSummary
  let totalSpending = 0;
  let totalOrders = 0;
  const purchasedItems: ShoppingItem[] = [];

  for (const o of orders) {
    totalSpending += o.totalPrice;
    totalOrders += 1;

    // If we never found any products lines, push one "Unknown" item
    if (o.products.length === 0) {
      purchasedItems.push({
        orderId: o.orderId,
        orderDate: o.orderDate,
        productName: "Unknown",
        variationName: "Unknown",
        quantity: 1,
        totalPrice: o.totalPrice,
        orderStatus: o.orderStatus,
      });
    } else {
      // For each product, build a ShoppingItem
      o.products.forEach((p) => {
        purchasedItems.push({
          orderId: o.orderId,
          orderDate: o.orderDate,
          productName: p.productName,
          variationName: p.variationName,
          quantity: p.quantity,
          totalPrice: o.totalPrice,
          orderStatus: o.orderStatus,
        });
      });
    }
  }

  console.log("[parseShoppingTxt] Summary after single-pass parse:", {
    totalSpending,
    totalOrders,
    purchasedItems,
  });

  return { totalSpending, totalOrders, purchasedItems };
}

/**
 * Parses the *JSON-based* shopping data from "OrderHistories".
 */
function parseShoppingJSON(orderHistObj: Record<string, any>): ShoppingSummary {
  console.log("[parseShoppingJSON] orderHistObj:", orderHistObj);

  let totalSpending = 0;
  let totalOrders = 0;
  const purchasedItems: ShoppingItem[] = [];

  for (const orderId of Object.keys(orderHistObj)) {
    const orderDetails = orderHistObj[orderId];

    const orderDate = orderDetails?.order_date || "Unknown";
    const orderStatus = orderDetails?.order_status || "Unknown";
    let numericPrice = 0;

    try {
      const priceStr = orderDetails?.total_price || "0 USD";
      numericPrice = parseFloat(priceStr.split(/\s+/)[0]); // e.g. "10.68"
      if (!isNaN(numericPrice)) {
        totalSpending += numericPrice;
      }
    } catch (e) {
      // ignore parse errors
    }

    totalOrders += 1;

    // Collect product items
    const productList = Array.isArray(orderDetails?.Products)
      ? orderDetails.Products
      : [];

    if (productList.length === 0) {
      purchasedItems.push({
        orderId,
        orderDate,
        productName: "Unknown",
        variationName: "Unknown",
        quantity: 1,
        totalPrice: numericPrice,
        orderStatus,
      });
    } else {
      productList.forEach((p: any) => {
        purchasedItems.push({
          orderId,
          orderDate,
          productName: p.product_name || "Unknown",
          variationName: p.variation_name || "Unknown",
          quantity: p.quantity || 1,
          totalPrice: numericPrice,
          orderStatus,
        });
      });
    }
  }

  console.log("[parseShoppingJSON] Final Summary:", {
    totalSpending,
    totalOrders,
    purchasedItems,
  });

  return { totalSpending, totalOrders, purchasedItems };
}

/**
 * Main function: unifies data from either a JSON export or a ZIP-to-JSON conversion 
 * into a consistent structured object.
 */
export function processTikTokData(data: any, myUsername: string): ProcessedTikTokData {
  console.log("[processTikTokData] Received data for user:", myUsername);
  console.log("[processTikTokData] Top-level keys in data:", Object.keys(data || {}));

  // 1) Profile
  let profileData: ProfileData;
  if (typeof data?.Profile?.["Profile Info"] === "string") {
    const lines = data.Profile["Profile Info"].split("\n").map((line: string) => line.trim());
    let name = "Unknown";
    let birthDate = "Unknown";
    for (const line of lines) {
      if (line.startsWith("Username:")) {
        name = line.substring("Username:".length).trim();
      }
      if (line.startsWith("Birthdate:")) {
        birthDate = line.substring("Birthdate:".length).trim();
      }
    }
    profileData = { name, birthDate };
    console.log("[processTikTokData] Profile info read from TXT-like data:", profileData);
  } else {
    // Attempt JSON-based
    profileData = {
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
    console.log("[processTikTokData] Profile info read from JSON-like data:", profileData);
  }

  // 2) Direct Messages
  let dmSummaryObj: DMSummary = {};
  let sentMessagesList: SentMessage[] = [];
  let chatMessages: Record<string, ChatMessage[]> = {};

  if (typeof data["Direct Messages"]?.["Chat History"]?.ChatHistory === "string") {
    // .txt-based DMs
    console.log("[processTikTokData] DM data is a single TXT string. Parsing as text...");
    const dmText = data["Direct Messages"]["Chat History"].ChatHistory;
    const threads = dmText.split(">>>").filter((s: string) => s.trim().length > 0);
    threads.forEach((threadText: string) => {
      const lines = threadText.split("\n").filter((s: string) => s.trim().length > 0);
      if (lines.length === 0) return;
      const headerMatch = lines[0].match(/^\s*Chat History with\s+([^:]+)::/);
      let contact = "unknown";
      if (headerMatch) {
        contact = headerMatch[1].trim().toLowerCase();
      }
      chatMessages[contact] = [];
      const msgRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+([^:]+):\s+(.*)$/;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(msgRegex);
        if (match) {
          const date = match[1];
          const sender = match[2].trim();
          const message = match[3].trim();
          chatMessages[contact].push({ date, sender, message });
          if (sender.toLowerCase() === myUsername) {
            sentMessagesList.push({ Contact: contact, Date: date });
          }
        }
      }
      dmSummaryObj[contact] = chatMessages[contact].length;
    });
  } else {
    // JSON-based DMs
    console.log("[processTikTokData] DM data is JSON-like. Parsing as object...");
    const dmDataRaw = data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
    Object.keys(dmDataRaw).forEach((threadName: string) => {
      const contact = threadName
        .replace("Chat History with", "")
        .replace(":", "")
        .trim()
        .toLowerCase();
      const messages = dmDataRaw[threadName];
      if (Array.isArray(messages) && messages.length > 0) {
        dmSummaryObj[contact] = messages.length;
        chatMessages[contact] = messages.map((msg: any) => ({
          date: msg.Date,
          sender: msg.From || "Unknown",
          message: msg.Content || "",
        }));
        messages.forEach((msg: any) => {
          if (msg.From && msg.From.toLowerCase() === myUsername) {
            sentMessagesList.push({ Contact: contact, Date: msg.Date });
          }
        });
      }
    });
  }

  // 3) Login History
  console.log("[processTikTokData] Checking login history...");
  let loginData: any[] = [];
  if (typeof data.Activity?.["Login History"]?.["LoginHistoryList"] === "string") {
    // .txt-based
    const text = data.Activity["Login History"]["LoginHistoryList"];
    loginData = text
      .split("\n")
      .filter((line: string) => line.trim().length > 0)
      .map((line: string) => ({ Date: line.trim() }));
    console.log("[processTikTokData] Login history from TXT. Count:", loginData.length);
  } else {
    // JSON-based
    loginData = data.Activity?.["Login History"]?.["LoginHistoryList"] || [];
    console.log("[processTikTokData] Login history from JSON-like. Count:", loginData.length);
  }

  // 4) Shopping
  console.log("[processTikTokData] Checking 'TikTok Shopping' data...");
  let shoppingDataRaw = data["TikTok Shopping"];
  if (!shoppingDataRaw && data["Tiktok Shopping"]) {
    console.warn(
      "[processTikTokData] 'TikTok Shopping' not found, but found 'Tiktok Shopping'. Using that instead."
    );
    shoppingDataRaw = data["Tiktok Shopping"];
  }

  let shoppingData: ShoppingSummary = {
    totalSpending: 0,
    totalOrders: 0,
    purchasedItems: [],
  };

  if (!shoppingDataRaw) {
    console.log("[processTikTokData] No 'TikTok Shopping' found. Setting summary to 0.");
  } else if (typeof shoppingDataRaw === "string") {
    // The entire "TikTok Shopping" is a raw string
    console.log("[processTikTokData] 'TikTok Shopping' is a string => parseShoppingTxt()");
    shoppingData = parseShoppingTxt(shoppingDataRaw);
  } else if (typeof shoppingDataRaw === "object") {
    console.log("[processTikTokData] 'TikTok Shopping' is an object. Keys:", Object.keys(shoppingDataRaw));
    const oh = shoppingDataRaw["Order History"];
    console.log("[processTikTokData] Inside 'TikTok Shopping', 'Order History' =>", oh);

    if (!oh) {
      console.log("[processTikTokData] No 'Order History' sub-key found. Using 0 fallback.");
    } else if (typeof oh === "string") {
      // typical .txt-based "Order History.txt" content
      console.log("[processTikTokData] 'Order History' is a string => parseShoppingTxt()");
      shoppingData = parseShoppingTxt(oh);
    } else if (typeof oh === "object") {
      // typical JSON approach => oh.OrderHistories = { "some_id": {...}, ... }
      console.log("[processTikTokData] 'Order History' is an object. Checking oh.OrderHistories =>", oh.OrderHistories);
      if (oh.OrderHistories && typeof oh.OrderHistories === "object") {
        console.log("[processTikTokData] Found 'OrderHistories' => parseShoppingJSON()");
        shoppingData = parseShoppingJSON(oh.OrderHistories);
      } else if ("totalSpending" in oh && "totalOrders" in oh) {
        console.log("[processTikTokData] 'Order History' already has totalSpending/Orders. Using directly.");
        shoppingData = oh;
      } else {
        console.log("[processTikTokData] 'Order History' object not recognized. Fallback => 0.");
      }
    } else {
      console.log("[processTikTokData] 'Order History' is neither string nor object => fallback.");
    }
  } else {
    console.log("[processTikTokData] 'TikTok Shopping' unknown type => fallback.");
  }

  console.log("[processTikTokData] Final Shopping Summary =>", shoppingData);

  // Return the entire processed data
  return {
    profileData,
    dmData: { dmSummaryObj, sentMessagesList, chatMessages },
    loginData,
    shoppingData,
  };
}
