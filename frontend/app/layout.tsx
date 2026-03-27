import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const metadata: Metadata = {
  title: "FeedPulse",
  description: "Collect product feedback and route it into FeedPulse.",
};

function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export { metadata };
export default RootLayout;
