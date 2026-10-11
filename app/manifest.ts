import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi puesto",
    short_name: "Mi puesto",
    description: "Ventas y stock para puestos de feria",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f3ee",
    theme_color: "#0e6f68",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
