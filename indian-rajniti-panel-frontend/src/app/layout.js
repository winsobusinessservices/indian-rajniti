import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ToastProvider from "@/components/common/ToastProvider";
import ConfirmDialogProvider from "@/components/common/ConfirmDialogProvider";
import AuthorWorkspaceShell from "@/components/author/AuthorWorkspaceShell";
import { AdminSiteProvider } from "@/context/AdminSiteContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Editorial Panel | Indian Rajneeti",
    template: "%s | Indian Rajneeti Panel",
  },
  description: "Private editorial and administration panel for Indian Rajneeti.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700;900&display=swap" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background font-body-md">
        <ToastProvider />
        <ConfirmDialogProvider>
          <AuthProvider>
            <AdminSiteProvider><AuthorWorkspaceShell>{children}</AuthorWorkspaceShell></AdminSiteProvider>
          </AuthProvider>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
