import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Our Beats",
    short_name: "Our Beats",
    description:
      "Turn every device into a synchronized speaker. Our Beats is a music player for multi-device audio playback. Host a listening party today!",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
