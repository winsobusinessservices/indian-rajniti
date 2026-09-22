import BreakingNews from "@/components/layout/BreakingNews";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import InvestorDashboardClient from "@/components/investor/InvestorDashboardClient";
import { getBreakingNews } from "@/features/news/news.api";

export const metadata = { title: "Investor Dashboard", robots: { index: false, follow: false } };

export default async function InvestorDashboardPage() {
  const breakingNews = await getBreakingNews();
  return <>
    <BreakingNews text={breakingNews} />
    <Header />
    <main className="flex-grow bg-background"><InvestorDashboardClient /></main>
    <Footer />
  </>;
}
