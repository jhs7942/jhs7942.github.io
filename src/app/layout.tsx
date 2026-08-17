import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { notoSansKR } from "@/lib/fonts";
import { SITE } from "@/lib/site";
import { RoughFilters, SiteHeader, SiteFooter } from "./_components/Chrome";
import { RouteChrome } from "./_components/RouteChrome";
import { TimeTheme } from "./_components/TimeTheme";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s | ${SITE.title}` },
  description: SITE.description,
  applicationName: "정현승 포트폴리오",
  keywords: ["정현승", "웹 개발자", "프론트엔드", "React", "TypeScript", "포트폴리오", "기술 블로그"],
  authors: [{ name: SITE.author, url: SITE.url }],
  creator: SITE.author,
  publisher: SITE.author,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: "/",
    siteName: SITE.title,
    title: SITE.title,
    description: SITE.description,
    images: [
      {
        url: "/portfolio/og-portfolio.png",
        width: 1200,
        height: 630,
        alt: "정현승 웹 개발자 포트폴리오 히어로 화면",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/portfolio/og-portfolio.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { const h = new Date().getHours(); const root = document.documentElement; let saved = null; try { saved = localStorage.getItem("portfolio-theme"); } catch {} root.dataset.theme = ["day", "sunset", "night"].includes(saved) ? saved : h >= 6 && h < 17 ? "day" : h >= 17 && h < 20 ? "sunset" : "night"; root.dataset.greeting = h >= 6 && h < 12 ? "morning" : h >= 12 && h < 18 ? "day" : "evening"; })();`,
          }}
        />
        <TimeTheme />
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
