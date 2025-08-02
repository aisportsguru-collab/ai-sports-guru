import Link from 'next/link';
import { useState } from 'react';

// List of supported sports and their corresponding routes
const sports = [
  { name: 'NBA', href: '/nba' },
  { name: 'NFL', href: '/nfl' },
  { name: 'MLB', href: '/mlb' },
  { name: 'NHL', href: '/nhl' },
  { name: 'NCAAF', href: '/ncaaf' },
  { name: 'NCAAB', href: '/ncaab' },
  { name: 'WNBA', href: '/wnba' }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white shadow sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-secondary">
            AI Sports Guru
          </Link>
          {/* Navigation Links (desktop) */}
          <nav className="hidden md:flex items-center space-x-6">
            <div className="relative group">
              <button
                className="inline-flex items-center text-gray-700 hover:text-secondary focus:outline-none"
                onClick={() => setOpen(!open)}
              >
                <span>Sports</span>
                <svg
                  className="ml-1 h-4 w-4 fill-current"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                </svg>
              </button>
              {/* Dropdown menu */}
              {open && (
                <ul className="absolute left-0 mt-2 w-36 bg-white border rounded-md shadow-lg">
                  {sports.map((sport) => (
                    <li key={sport.name} className="">
                      <Link
                        href={sport.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setOpen(false)}
                      >
                        {sport.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link href="/pricing" className="text-gray-700 hover:text-secondary">
              Pricing
            </Link>
            {/* Authentication buttons - linking to auth pages */}
            <div className="flex space-x-4">
              <Link href="/sign-in" className="btn btn-secondary">Sign in</Link>
              <Link href="/sign-up" className="btn btn-primary">Sign up</Link>
            </div>
          </nav>
          {/* Mobile menu button */}
          <button
            className="md:hidden flex items-center text-gray-700 hover:text-secondary focus:outline-none"
            onClick={() => setOpen(!open)}
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {/* Mobile dropdown menu */}
        {open && (
          <div className="md:hidden pb-4">
            <ul className="space-y-2">
              {sports.map((sport) => (
                <li key={sport.name}>
                  <Link
                    href={sport.href}
                    className="block px-2 py-2 text-gray-700 hover:bg-gray-100 rounded"
                    onClick={() => setOpen(false)}
                  >
                    {sport.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col space-y-2">
              <Link href="/pricing" className="text-gray-700 hover:text-secondary">
                Pricing
              </Link>
              <Link href="/sign-in" className="btn btn-secondary">Sign in</Link>
              <Link href="/sign-up" className="btn btn-primary">Sign up</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}