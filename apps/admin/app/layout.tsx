import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Huntly World Admin",
  description: "Admin app for Huntly World",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {process.env.NEXT_PUBLIC_APP_ENV === "preview" && (
          <div className="bg-orange-500 text-white text-center text-sm py-1 font-medium sticky top-0 z-50">
            ⚠️ Preview — connected to develop database
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
