"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">Plamento</h1>
              <span className="text-xl font-semibold text-white mx-1">/</span>
              <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">MockLee</h1>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
