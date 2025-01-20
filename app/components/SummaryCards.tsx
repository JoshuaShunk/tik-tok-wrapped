// app/components/SummaryCards.tsx
"use client";
import React, { useState, useRef, useMemo } from "react";
import { toPng } from "html-to-image";
import {
  ProfileData,
  ShoppingSummary,
  SentMessage,
  LoginHistory,
} from "@/app/utils/dataProcessing";

// =================================================================
// Helper Functions
// =================================================================

function getTop5Purchased(shopping: ShoppingSummary | null | undefined) {
  if (!shopping) return [];
  const productCount: Record<string, number> = {};
  shopping.purchasedItems.forEach((item) => {
    const lowerName = item.productName.toLowerCase();
    if (!productCount[lowerName]) productCount[lowerName] = 0;
    productCount[lowerName] += item.quantity;
  });
  const arr = Object.entries(productCount).map(([name, qty]) => ({
    name,
    qty,
  }));
  arr.sort((a, b) => b.qty - a.qty);
  return arr.slice(0, 5);
}

function getTop5Friends(dmSummary: Record<string, number> | null | undefined) {
  if (!dmSummary) return [];
  const arr = Object.entries(dmSummary).map(([contact, total]) => ({
    contact,
    total,
  }));
  arr.sort((a, b) => b.total - a.total);
  return arr.slice(0, 5);
}

/**
 * Returns the top 5 most expensive items bought.
 * This version groups items by product name and sums the entire totalPrice from each order.
 */
function getTop5Expensive(shopping: ShoppingSummary | null | undefined) {
  if (!shopping) return [];
  const productCost: Record<string, number> = {};
  const productNames: Record<string, string> = {};

  shopping.purchasedItems.forEach((item) => {
    const lowerName = item.productName.toLowerCase();
    const cost = item.totalPrice; // Using totalPrice from ShoppingItem
    if (!productCost[lowerName]) productCost[lowerName] = 0;
    productCost[lowerName] += cost;
    productNames[lowerName] = item.productName;
  });

  const arr = Object.entries(productCost).map(([name, cost]) => ({
    name: productNames[name],
    cost,
  }));
  arr.sort((a, b) => b.cost - a.cost);
  return arr.slice(0, 5);
}

function getBusiestMonth(logins: LoginHistory[]) {
  if (!logins || logins.length === 0) return { busiestMonth: "N/A", logins: 0 };
  const counts: Record<string, number> = {};
  logins.forEach((l) => {
    const d = new Date(l.Date);
    if (!isNaN(d.getTime())) {
      const key = d.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!counts[key]) counts[key] = 0;
      counts[key]++;
    }
  });
  let max = 0;
  let busiest = "N/A";
  Object.keys(counts).forEach((k) => {
    if (counts[k] > max) {
      max = counts[k];
      busiest = k;
    }
  });
  return { busiestMonth: busiest, logins: max };
}

/**
 * Renders unique, bold decorative shapes for each slide.
 * These shapes combine different geometries (circles, diamonds, triangles)
 * with gradients or bold solid colors and are positioned to fill the card.
 */
function renderDecorativeShapes(slideKey: string) {
  switch (slideKey) {
    case "slide1-shopping":
      return (
        <>
          {/* Rotating gradient circle */}
          <div className="absolute top-[-40px] left-[-40px] w-40 h-40 bg-gradient-to-tr from-white to-yellow-300 opacity-60 rounded-full shadow-2xl animate-spin-slow"></div>
          {/* Bold diamond (rotated square) */}
          <div className="absolute bottom-[-30px] right-[-30px] w-48 h-48 bg-red-500 opacity-50 transform rotate-45 shadow-2xl"></div>
          {/* Triangle shape */}
          <div
            className="absolute top-[20%] right-[-20px] opacity-60"
            style={{
              width: 0,
              height: 0,
              borderLeft: "40px solid transparent",
              borderRight: "40px solid transparent",
              borderBottom: "60px solid green",
            }}
          ></div>
        </>
      );
    case "slide2-shopping-top5":
      return (
        <>
          {/* Bold rotated polygon (diamond shape via clip-path) */}
          <div
            className="absolute top-[-30px] right-[-30px] w-48 h-48 bg-indigo-500 opacity-70 shadow-xl"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          ></div>
          {/* Diagonal trapezoid */}
          <div
            className="absolute bottom-[-20px] left-[-10px] w-32 h-32 bg-yellow-500 opacity-70 shadow-2xl"
            style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)" }}
          ></div>
        </>
      );
    case "slide3-dm":
      return (
        <>
          {/* Bold irregular polygon (using clip-path) */}
          <div
            className="absolute top-[-50px] left-[-50px] w-56 h-56 bg-blue-400 opacity-70 shadow-2xl"
            style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 20% 100%)" }}
          ></div>
          {/* Rotated square (diamond) */}
          <div className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-cyan-500 opacity-70 transform rotate-45 shadow-xl"></div>
          {/* Triangle */}
          <div
            className="absolute top-[30%] left-[-20px] opacity-70"
            style={{
              width: 0,
              height: 0,
              borderRight: "50px solid transparent",
              borderLeft: "50px solid transparent",
              borderBottom: "70px solid #1E40AF", // blue-700
            }}
          ></div>
        </>
      );
    case "slide4-dm-top5":
      return (
        <>
          {/* Hexagon-like shape via clip-path */}
          <div
            className="absolute top-[-20px] right-[-20px] w-44 h-44 bg-purple-500 opacity-70 transform rotate-12 shadow-2xl"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          ></div>
          {/* Bold circle */}
          <div className="absolute bottom-[-10px] left-[-10px] w-36 h-36 bg-pink-500 opacity-70 rounded-full shadow-xl"></div>
        </>
      );
    case "slide5-login":
      return (
        <>
          {/* Big circle with gradient */}
          <div className="absolute top-[-60px] left-[15%] w-56 h-56 bg-green-500 opacity-70 rounded-full shadow-2xl"></div>
          {/* Rotated bold shape */}
          <div className="absolute bottom-[-40px] right-[15%] w-48 h-48 bg-lime-500 opacity-70 transform rotate-45 shadow-2xl"></div>
          {/* Triangle shape */}
          <div
            className="absolute bottom-[10%] left-[-20px] opacity-70"
            style={{
              width: 0,
              height: 0,
              borderLeft: "50px solid transparent",
              borderRight: "50px solid transparent",
              borderBottom: "70px solid #15803D", // green-700
            }}
          ></div>
        </>
      );
    case "slide6-profile":
      return (
        <>
          {/* Bold circle */}
          <div className="absolute top-[-30px] left-[-30px] w-40 h-40 bg-orange-500 opacity-70 rounded-full shadow-2xl"></div>
          {/* Rotated trapezoid */}
          <div
            className="absolute bottom-[-30px] right-[-30px] w-40 h-40 bg-amber-500 opacity-70 shadow-xl"
            style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)" }}
          ></div>
          {/* Small rotated square */}
          <div className="absolute top-[40%] right-[-10px] w-24 h-24 bg-red-300 opacity-60 transform rotate-12 shadow-lg"></div>
        </>
      );
    case "slide7-thanks":
      return (
        <>
          {/* Large circle */}
          <div className="absolute top-[-40px] left-[-40px] w-48 h-48 bg-purple-700 opacity-70 rounded-full shadow-2xl"></div>
          {/* Bold diamond */}
          <div className="absolute bottom-[-40px] right-[-40px] w-48 h-48 bg-fuchsia-500 opacity-70 transform rotate-45 shadow-2xl"></div>
          {/* Triangle */}
          <div
            className="absolute top-[30%] left-[30%] opacity-70"
            style={{
              width: 0,
              height: 0,
              borderLeft: "40px solid transparent",
              borderRight: "40px solid transparent",
              borderBottom: "60px solid #FBBF24", // yellow-500
            }}
          ></div>
        </>
      );
    default:
      return null;
  }
}

// =================================================================
// Component
// =================================================================

interface SummaryCardsProps {
  profile: ProfileData | null;
  dmSummary: Record<string, number> | null;
  sentMessages: SentMessage[];
  loginHistory: LoginHistory[];
  shoppingSummary: ShoppingSummary | null;
  onClose: () => void;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  profile,
  dmSummary,
  sentMessages,
  loginHistory,
  shoppingSummary,
  onClose,
}) => {
  // Calculate values using helper functions
  const top5Items = useMemo(
    () => getTop5Purchased(shoppingSummary),
    [shoppingSummary]
  );
  const top5Expensive = useMemo(
    () => getTop5Expensive(shoppingSummary),
    [shoppingSummary]
  );
  const top5Friends = useMemo(() => getTop5Friends(dmSummary), [dmSummary]);
  const totalLogins = loginHistory.length;
  const busiest = getBusiestMonth(loginHistory);

  // Use first top purchased item for main shopping card
  const shoppingTopItem = top5Items.length ? top5Items[0] : null;
  // Use first DM friend for main DM card
  const dmsTopFriend = top5Friends.length ? top5Friends[0] : null;

  // Slides Ordering:
  // 1. Main Shopping Card
  // 2. Top 5 Expensive Shopping Items Card
  // 3. Main DM Card
  // 4. Top 5 DM Friends Card
  // 5. Login Stats Card
  // 6. About You Card
  // 7. Thank You Card
  const slidesData = [
    {
      key: "slide1-shopping",
      backgroundStyle:
        "bg-gradient-to-br from-yellow-400 to-pink-400 relative overflow-hidden",
      title: "Shopping Stats",
      content: (
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide opacity-80">
            My total spend
          </p>
          <p className="text-4xl font-bold my-4">
            ${shoppingSummary?.totalSpending.toFixed(2) || "0.00"}
          </p>
          <p className="text-xs uppercase opacity-80">
            {shoppingTopItem
              ? `Top Item: ${shoppingTopItem.name} (${shoppingTopItem.qty})`
              : "No Purchases"}
          </p>
        </div>
      ),
    },
    {
      key: "slide2-shopping-top5",
      backgroundStyle:
        "bg-gradient-to-br from-red-500 to-amber-500 relative overflow-hidden",
      title: "Top 5 Expensive Items",
      content: (
        <div className="flex flex-col items-center">
          {top5Expensive.length > 0 ? (
            // Ordered list with numbers, extra spacing, and left-aligned items
            <ol className="space-y-4">
              {top5Expensive.map((item, idx) => (
                <li key={item.name} className="flex items-center space-x-2">
                  <span className="text-2xl font-bold">{idx + 1}</span>
                  <span className="text-lg">
                    {item.name} (${item.cost.toFixed(2)})
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs opacity-80">No Purchases</p>
          )}
        </div>
      ),
    },
    {
      key: "slide3-dm",
      backgroundStyle:
        "bg-gradient-to-br from-blue-600 to-blue-900 relative overflow-hidden",
      title: "DM Stats",
      content: (
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide opacity-80">
            My total messages
          </p>
          <p className="text-4xl font-bold my-4">{sentMessages.length}</p>
          <p className="text-xs uppercase opacity-80">
            {dmsTopFriend
              ? `Top Friend: ${dmsTopFriend.contact} (${dmsTopFriend.total} msgs)`
              : "No DMs"}
          </p>
        </div>
      ),
    },
    {
      key: "slide4-dm-top5",
      backgroundStyle:
        "bg-gradient-to-br from-indigo-500 to-violet-500 relative overflow-hidden",
      title: "Top 5 DM Friends",
      content: (
        <div className="flex flex-col items-center">
          {top5Friends.length > 0 ? (
            <ol className="space-y-4">
              {top5Friends.map((friend, idx) => (
                <li
                  key={friend.contact}
                  className="flex items-center space-x-2"
                >
                  <span className="text-2xl font-bold">{idx + 1}</span>
                  <span className="text-lg">
                    {friend.contact} ({friend.total} msgs)
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs opacity-80">No DM activity</p>
          )}
        </div>
      ),
    },
    {
      key: "slide5-login",
      backgroundStyle:
        "bg-gradient-to-br from-green-600 to-green-900 relative overflow-hidden",
      title: "Login Stats",
      content: (
        <>
          <p className="text-lg mt-4 mb-4">
            Total Logins:
            <span className="font-bold text-green-300"> {totalLogins}</span>
          </p>
          <p className="text-sm">
            Busiest Month:{" "}
            <span className="font-semibold">{busiest.busiestMonth}</span>
            <span className="opacity-80"> ({busiest.logins} logins)</span>
          </p>
        </>
      ),
    },
    {
      key: "slide6-profile",
      backgroundStyle:
        "bg-gradient-to-br from-orange-500 to-amber-600 relative overflow-hidden",
      title: "About You",
      content: (
        <>
          <p className="text-xl font-semibold mb-4">
            {profile?.name || "Unknown User"}
          </p>
          <p className="text-sm opacity-90 mb-4">
            Birth Date: {profile?.birthDate || "Unknown"}
          </p>
          <p className="text-sm">
            You sent a total of{" "}
            <span className="font-bold text-yellow-100">
              {sentMessages.length}
            </span>{" "}
            messages!
          </p>
        </>
      ),
    },
    {
      key: "slide7-thanks",
      backgroundStyle:
        "bg-gradient-to-br from-purple-700 to-fuchsia-900 relative overflow-hidden",
      title: "Thank You!",
      content: (
        <>
          <p className="text-md mt-4">Thanks for being part of our year!</p>
          <p className="text-sm opacity-90 mt-2">
            Share these cards to show off your Wrapped stats.
          </p>
        </>
      ),
    },
  ];

  // Prepare refs for each slide
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardRefs = slidesData.map(() => useRef<HTMLDivElement>(null));

  const handleDownload = async (idx: number) => {
    const node = cardRefs[idx].current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node);
      const link = document.createElement("a");
      link.download = `wrapped_${slidesData[idx].key}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating PNG:", err);
    }
  };

  const prevSlide = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + slidesData.length) % slidesData.length
    );
  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % slidesData.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm mx-auto rounded-lg shadow-lg p-4 z-10">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 font-bold"
        >
          X
        </button>
        <div
          ref={cardRefs[currentIndex]}
          className={`relative aspect-[9/16] w-full overflow-hidden flex flex-col items-center justify-center text-white p-4 rounded-md shadow-xl ${slidesData[currentIndex].backgroundStyle}`}
        >
          {/* Background overlay pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply bg-[url('/assets/funshapes.png')] bg-cover bg-center" />
          {/* Unique Decorative Shapes */}
          {renderDecorativeShapes(slidesData[currentIndex].key)}
          {/* Title with extra vertical margin */}
          <h2 className="absolute top-12 left-1/2 transform -translate-x-1/2 text-4xl font-extrabold drop-shadow-xl mb-6 tracking-wide title-style font-comic-sans">
            {slidesData[currentIndex].title}
          </h2>
          {/* Center content container with added vertical spacing */}
          <div className="w-full max-w-xs mx-auto text-center z-10 mt-24">
            {slidesData[currentIndex].content}
          </div>
          <div className="absolute bottom-3 left-3 text-sm opacity-70">
            <p>© 2025 MyApp Wrapped</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={prevSlide}
            className="bg-gray-200 px-4 py-2 rounded-md font-semibold hover:bg-gray-300"
          >
            Prev
          </button>
          <button
            onClick={() => handleDownload(currentIndex)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700"
          >
            Download
          </button>
          <button
            onClick={nextSlide}
            className="bg-gray-200 px-4 py-2 rounded-md font-semibold hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
