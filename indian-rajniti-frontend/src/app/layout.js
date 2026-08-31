import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import ToastProvider from "@/components/common/ToastProvider";
import AuthorWorkspaceShell from "@/components/author/AuthorWorkspaceShell";

export const dynamic = "force-dynamic";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Indian Rajneeti — Indian Political News & Analysis",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Indian politics", "political news India", "elections India", "Parliament", "Lok Sabha", "Rajya Sabha", "policy analysis"],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: SITE_NAME,
    title: "Indian Rajneeti — Indian Political News & Analysis",
    description: SITE_DESCRIPTION,
    images: [{ url: "/images/logo.png", width: 1401, height: 752, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indian Rajneeti — Indian Political News & Analysis",
    description: SITE_DESCRIPTION,
    images: ["/images/logo.png"],
  },
  robots: { index: true, follow: true },
  category: "news",
};

// suppressHydrationWarning below: some browser extensions (e.g. LanguageTool)
// inject attributes like data-lt-installed onto <html> before React
// hydrates — that's a mismatch React can't fix and shouldn't warn about,
// since the app never rendered those attributes itself.
export default async function RootLayout({ children }) {
  // API-backed pages must not contact the separately deployed cPanel backend
  // while `next build` is prerendering. Rendering starts once a real request
  // reaches the running Next.js application instead.
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <ToastProvider />
        <AuthProvider>
          <AuthorWorkspaceShell>{children}</AuthorWorkspaceShell>
        </AuthProvider>
      </body>
    </html>
  );
}
