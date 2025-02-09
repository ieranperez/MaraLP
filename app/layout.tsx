import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MARA System",
  description: "Medical Access and Resource Allocation System",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-100`}>
        <Providers>
          <header className="bg-[#4169E1] text-white p-4">
            <h1 className="text-2xl font-bold">MARA System</h1>
          </header>
          <main className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Medical Access and Resource Allocation System</h1>
            {children}
          </main>
          <footer className="text-center text-xs text-gray-500 py-4">
            Intellectual Property of Perez Ieran Chris Eugenio | Contact ieperez@up.edu.ph for help
          </footer>
        </Providers>
      </body>
    </html>
  )
}

