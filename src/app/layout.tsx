import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { notoSansKR } from "@/lib/fonts";
import { SITE } from "@/lib/site";
import { RoughFilters, SiteHeader, SiteFooter } from "./_components/Chrome";
import { RouteChrome } from "./_components/RouteChrome";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s | ${SITE.title}` },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${geistMono.variable} antialiased`}>
      <body>
        <RoughFilters />
        <div className="grain" aria-hidden />
        <RouteChrome>
          <SiteHeader />
        </RouteChrome>
        {children}
        <RouteChrome>
          <SiteFooter />
        </RouteChrome>
      </body>
    </html>
  );
}
