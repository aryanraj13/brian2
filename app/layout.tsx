import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Personal Brain",
  description: "A conversational agent over your Gmail and Drive.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">{children}</body>
    </html>
  );
}
