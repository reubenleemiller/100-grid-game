import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Hundred Squares | Team Challenge",
  description: "A flexible, classroom-ready 100-grid team game.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
