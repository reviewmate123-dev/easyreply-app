import "./globals.css";
import Footer from "./components/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={styles.container}>
          <div style={styles.content}>
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
  },
};