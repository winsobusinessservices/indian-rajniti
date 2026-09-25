import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { serializeJsonLd } from "@/lib/seo";
import ToastProvider from "@/components/common/ToastProvider";
import ConfirmDialogProvider from "@/components/common/ConfirmDialogProvider";
import { SiteProvider } from "@/context/SiteContext";
import { getCurrentSite } from "@/lib/currentSite";
import { mediaUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

async function loadSite() {
  try { return await getCurrentSite(); } catch { return { name: "Indian Rajneeti", domain: "indianrajneeti.com" }; }
}

export async function generateMetadata() {
  const site = await loadSite();
  const siteUrl = `https://${site.domain}`;
  const description = site.description || site.subtitle || "Political news, election coverage, and analysis.";
  const image = site.logo_url ? mediaUrl(site.logo_url) : `${siteUrl}/images/logo.png`;
  const iconVersion = encodeURIComponent(site.updated_at || site.id || "default");
  const rawIcon = site.icon_url
    ? mediaUrl(site.icon_url)
    : site.logo_url
      ? mediaUrl(site.logo_url)
      : "/images/indian-rajneeti-favicon.ico";
  const icon = `${rawIcon}${rawIcon.includes("?") ? "&" : "?"}v=${iconVersion}`;
  return {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Political News & Analysis`,
    template: `%s | ${site.name}`,
  },
  description,
  applicationName: site.name,
  keywords: ["Indian politics", "political news India", "India elections", "Parliament news", "Lok Sabha", "Rajya Sabha", "government policy India", "political analysis"],
  authors: [{ name: site.name, url: siteUrl }],
  creator: site.name,
  publisher: site.name,
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/", languages: { "en-IN": "/" } },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: site.name,
    title: `${site.name} — Political News & Analysis`,
    description,
    images: [{ url: image }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Political News & Analysis`,
    description,
    images: [image],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "news",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: [{ url: icon }],
    shortcut: [{ url: icon }],
    apple: [{ url: icon }],
  },
  };
}

// suppressHydrationWarning below: some browser extensions (e.g. LanguageTool)
// inject attributes like data-lt-installed onto <html> before React
// hydrates — that's a mismatch React can't fix and shouldn't warn about,
// since the app never rendered those attributes itself.
export default async function RootLayout({ children }) {
  // API-backed pages must not contact the separately deployed cPanel backend
  // while `next build` is prerendering. Rendering starts once a real request
  // reaches the running Next.js application instead.
  const site = await loadSite();
  const siteUrl = `https://${site.domain}`;
  const description = site.description || site.subtitle || "Political news, election coverage, and analysis.";
  const logo = site.logo_url ? mediaUrl(site.logo_url) : `${siteUrl}/images/logo.png`;
  const siteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        "@id": `${siteUrl}/#organization`,
        name: site.name,
        alternateName: site.subtitle || site.name,
        description,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: logo,
          contentUrl: logo,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: site.name,
        alternateName: site.subtitle || site.name,
        description,
        inLanguage: "en-IN",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning style={{ "--color-primary": site.primary_color || "#002068", "--color-secondary": site.secondary_color || "#8f4e00" }}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700;900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background font-body-md">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteSchema) }} />
        <ToastProvider />
        <ConfirmDialogProvider>
          <SiteProvider site={site}>
            <AuthProvider>{children}</AuthProvider>
          </SiteProvider>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
