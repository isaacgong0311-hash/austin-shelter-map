import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Austin Shelter Map',
  description: 'Real-time shelter bed availability across Austin, TX',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white`} style={{ height: '100dvh', overflow: 'hidden' }}>
        <div className="flex flex-col h-full">
          {/* Navbar */}
          <header className="shrink-0 flex items-center justify-between px-5 h-14 bg-gray-950/90 backdrop-blur border-b border-gray-800/60 z-50">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-sm">🏠</div>
              <div>
                <span className="font-bold text-sm text-white tracking-tight">Austin Shelter Map</span>
                <span className="ml-2 text-xs text-gray-500 hidden sm:inline">Real-time bed availability</span>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              <a href="/" className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">Map</a>
              <a href="/about" className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">About</a>
              <a href="/login" className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors font-medium">Staff Login</a>
            </nav>
          </header>

          {/* Page content */}
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
