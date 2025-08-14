import type { Metadata } from "next";
import "./globals.css";
import SupabaseListener from "@/components/SupabaseListener";

export const metadata: Metadata = {
  title: "AI Sports Guru",
  description: "AI-powered sports betting predictions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Keeps the server cookie in sync with client auth */}
        <SupabaseListener />
        {children}
      </body>
    </html>
  );
}
