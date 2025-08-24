import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "AI Sports Guru",
  description: "Sharp AI betting insights for NFL, NBA, MLB, NHL, NCAA & WNBA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#0B0B0B]">
      <body className="min-h-screen bg-[#0B0B0B] text-white">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
