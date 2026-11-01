import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRfolio — Your open-source story, beautifully told",
  description: "A living portfolio for your GitHub pull requests and open-source contributions.",
  applicationName: "PRfolio",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PRfolio" },
};

export const viewport: Viewport = { themeColor: "#0d1117", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
