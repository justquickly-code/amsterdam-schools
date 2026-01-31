import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/how-it-works", "/release-notes"],
        disallow: [
          "/admin",
          "/feedback",
          "/invite",
          "/login",
          "/planner",
          "/profile",
          "/settings",
          "/setup",
          "/shortlist",
        ],
      },
    ],
    sitemap: "https://mijnschoolkeuze.com/sitemap.xml",
  };
}
