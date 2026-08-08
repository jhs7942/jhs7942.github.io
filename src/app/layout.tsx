import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { jua, gothicA1, dotGothic } from "@/lib/fonts";
import { SITE } from "@/lib/site";
import { SiteHeader } from "./_components/SiteHeader";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.title}`,
  },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${gothicA1.variable} ${jua.variable} ${dotGothic.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-border-soft py-8">
          <p className="mx-auto max-w-3xl px-6 text-xs text-muted">
            © {SITE.author}
          </p>
        </footer>
      </body>
    </html>
  );
}
