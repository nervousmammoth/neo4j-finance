import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Neo4j Finance Frontend",
  description: "Upload banking data to Neo4j",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
