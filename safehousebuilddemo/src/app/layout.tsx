import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Verified — verified student housing in Groningen",
  description: "A verification and allocation layer for Groningen student housing: verified listings, a published queue, fair housemate choice, sublet with consent, and a public audit log.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
