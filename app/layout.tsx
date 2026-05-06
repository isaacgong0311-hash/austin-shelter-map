import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Austin Shelter Map',
  description: 'Real-time shelter bed availability across Austin, TX',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <a href="/" className="text-lg font-bold text-white">
            🏠 Austin Shelter Map
          </a>
          <div className="flex gap-4 text-sm text-gray-300">
            <a href="/" className="hover:text-white">Map</a>
            <a href="/about" className="hover:text-white">About</a>
            <a href="/login" className="hover:text-white">Staff Login</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
