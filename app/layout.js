import PageTracker from "../components/PageTracker";
import PwaRegister from "../components/PwaRegister";
import "./globals.css";

export const metadata = {
  title: "Silkcrayon Studios — Cardiff Bay",
  description: "Recording, artist development and release-ready production in Cardiff Bay.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Silkcrayon OS", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><PwaRegister/><PageTracker />{children}</body>
    </html>
  );
}
