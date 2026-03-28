import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "AMSC Performance | Engineered Athlete Development",
  description: "Train Smarter. Move Better. Perform Longer. AMSC Performance provides structured athletic development systems for elite and aspiring athletes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <Navbar />
        <main className="pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
