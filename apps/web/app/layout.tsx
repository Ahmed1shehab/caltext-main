import { Inter, Monoton, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const monoton = Monoton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo-face",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${plusJakartaSans.variable} ${monoton.variable}`}>
      <body>{children}</body>
    </html>
  );
}
