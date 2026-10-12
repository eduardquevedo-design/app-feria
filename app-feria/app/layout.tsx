import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = { title: "Mi puesto", description: "Ventas y stock para puestos de feria", icons: { apple: "/icons/icon-192.png" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e6f68" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={font.variable}>
      <body className="font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
