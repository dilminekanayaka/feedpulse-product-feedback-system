import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const metadata: Metadata = {
  title: {
    default: "FeedPulse",
    template: "%s | FeedPulse",
  },
  description: "FeedPulse frontend rebuild in progress.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export { metadata };
