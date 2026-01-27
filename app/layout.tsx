import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default theme; the homepage allows switching for comparison.
  return (
    <html lang="en" data-theme="gov">
      <body>{children}</body>
    </html>
  );
}
