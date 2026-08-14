import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://reconpro.dev";
  const routes = [
    { path: "", priority: 1.0, freq: "monthly" as const },
    { path: "/pricing", priority: 0.9, freq: "monthly" as const },
    { path: "/about", priority: 0.7, freq: "monthly" as const },
    { path: "/contact", priority: 0.6, freq: "yearly" as const },
    { path: "/docs", priority: 0.9, freq: "weekly" as const },
    { path: "/api-overview", priority: 0.9, freq: "weekly" as const },
    { path: "/security", priority: 0.8, freq: "monthly" as const },
    { path: "/trust", priority: 0.8, freq: "monthly" as const },
    { path: "/enterprise", priority: 0.8, freq: "monthly" as const },
    { path: "/privacy", priority: 0.5, freq: "yearly" as const },
    { path: "/terms", priority: 0.5, freq: "yearly" as const },
    { path: "/cookies", priority: 0.4, freq: "yearly" as const },
    { path: "/status", priority: 0.7, freq: "daily" as const },
    { path: "/changelog", priority: 0.6, freq: "weekly" as const },
    { path: "/roadmap", priority: 0.7, freq: "monthly" as const },
    { path: "/careers", priority: 0.5, freq: "monthly" as const },
    { path: "/login", priority: 0.6, freq: "yearly" as const },
    { path: "/register", priority: 0.6, freq: "yearly" as const },
  ];
  return routes.map(({ path, priority, freq }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }));
}
