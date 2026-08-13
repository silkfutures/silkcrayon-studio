import Analytics from "../components/Analytics";
import "./globals.css";

export const metadata = {
  title: "Silkcrayon Studios — Cardiff Bay",
  description: "Recording, artist development and release-ready production in Cardiff Bay.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Analytics />{children}</body>
    </html>
  );
}
