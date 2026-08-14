import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/content/posts";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const corePages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/portfolio/"),
      changeFrequency: "monthly",
      priority: 0.9,
      images: [absoluteUrl("/portfolio/og-portfolio.png")],
    },
  ];

  const postPages: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: absoluteUrl(`/posts/${post.slug}/`),
    lastModified: post.published_at,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...corePages, ...postPages];
}
