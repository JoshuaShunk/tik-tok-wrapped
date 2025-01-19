/* utils/chartUtils.ts */
import { SentMessage, LoginHistory } from "./dataProcessing";

/**
 * Returns a random hex color string.
 */
export function getRandomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Prepares the chart data for messages sent per person per month.
 */
export function prepareChartData(
  sentMessages: SentMessage[]
): { labels: string[]; datasets: any[] } {
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
}

/**
 * Prepares the chart data for login history (logins per month).
 */
export function prepareLoginChartData(
  loginHistory: LoginHistory[]
): { labels: string[]; datasets: any[] } {
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
}
