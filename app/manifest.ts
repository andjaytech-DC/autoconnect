import type { MetadataRoute } from "next";

const BASE_URL = "https://progressiveautohub.com";
const SITE_NAME = "Progressive AutoHub";
const SITE_DESCRIPTION =
  "India's trusted platform for certified pre-owned cars. Buy, sell and finance quality used cars with transparent pricing, flexible finance options and doorstep delivery.";

/**
 * Web App Manifest — served at /manifest.webmanifest.
 * Lets mobile users "install" Progressive AutoHub to their home screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "AutoHub",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b0f19",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
