import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: {
    default: "Indian Rajniti",
    template: "%s | Indian Rajniti",
  },
  description:
    "Authoritative political analysis, elections coverage, and policy discourse on Indian Rajniti.",
};

// suppressHydrationWarning below: some browser extensions (e.g. LanguageTool)
// inject attributes like data-lt-installed onto <html> before React
// hydrates — that's a mismatch React can't fix and shouldn't warn about,
// since the app never rendered those attributes itself.
export default function RootLayout({ children }) {
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
