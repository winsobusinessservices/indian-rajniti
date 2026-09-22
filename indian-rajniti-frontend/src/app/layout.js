import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { DEFAULT_SOCIAL_IMAGE, serializeJsonLd } from "@/lib/seo";
import ToastProvider from "@/components/common/ToastProvider";
import ConfirmDialogProvider from "@/components/common/ConfirmDialogProvider";

export const dynamic = "force-dynamic";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Indian Rajneeti — Indian Political News & Analysis",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Indian politics", "political news India", "India elections", "Parliament news", "Lok Sabha", "Rajya Sabha", "government policy India", "political analysis"],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/", languages: { "en-IN": "/" } },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: SITE_NAME,
    title: "Indian Rajneeti — Indian Political News & Analysis",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indian Rajneeti — Indian Political News & Analysis",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE.url],
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
};

// suppressHydrationWarning below: some browser extensions (e.g. LanguageTool)
// inject attributes like data-lt-installed onto <html> before React
// hydrates — that's a mismatch React can't fix and shouldn't warn about,
// since the app never rendered those attributes itself.
export default async function RootLayout({ children }) {
  // API-backed pages must not contact the separately deployed cPanel backend
  // while `next build` is prerendering. Rendering starts once a real request
  // reaches the running Next.js application instead.
  const siteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "Indian Rajneeti",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon.png`,
          contentUrl: `${SITE_URL}/icon.png`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: "Indian Rajneeti",
        description: SITE_DESCRIPTION,
        inLanguage: "en-IN",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
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
          <AuthProvider>
            {children}
          </AuthProvider>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
