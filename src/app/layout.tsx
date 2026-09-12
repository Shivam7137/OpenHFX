import type { Metadata } from "next";
import "@fontsource-variable/public-sans";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "OpenHFX · A shared local response",
  description:
    "Report local problems, contribute evidence, and follow the response. A clearly labeled local prototype.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
