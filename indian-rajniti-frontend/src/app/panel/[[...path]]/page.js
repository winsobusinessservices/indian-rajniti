import { redirect } from "next/navigation";

export const metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function StaffPanelRedirect({ params }) {
  const panelUrl = (process.env.NEXT_PUBLIC_PANEL_URL || "https://indianrajneeti.com").replace(/\/$/, "");
  const { path = [] } = await params;
  const panelPath = path.length ? `/panel/${path.map(encodeURIComponent).join("/")}` : "/panel/dashboard";
  redirect(`${panelUrl}${panelPath}`);
}
