import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Huntly Club Admin",
  description: "Admin app for Huntly Club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
