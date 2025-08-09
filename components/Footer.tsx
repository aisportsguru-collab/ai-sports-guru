"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-6 mt-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} AI Sports Guru. All rights reserved.
        </p>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <Link href="/privacy">
            <span className="text-sm hover:text-gray-400 cursor-pointer">
              Privacy Policy
            </span>
          </Link>
          <Link href="/terms">
            <span className="text-sm hover:text-gray-400 cursor-pointer">
              Terms of Use
            </span>
          </Link>
          <Link href="/disclaimer">
            <span className="text-sm hover:text-gray-400 cursor-pointer">
              Disclaimer
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
