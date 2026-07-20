import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sol Beauty Lab",
    short_name: "SŌL",
    description: "Studio management — Sol Beauty Lab",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3ecdf",
    theme_color: "#f7f1e3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
