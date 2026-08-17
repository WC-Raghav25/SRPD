import "./globals.css"

export const metadata = {
  title: "SRPD Shop",
  description: "Notebooks, Stationery, Daily Utility & Furniture",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
