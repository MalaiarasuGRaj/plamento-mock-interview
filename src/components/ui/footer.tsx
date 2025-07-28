"use client";

import { Linkedin, Mail } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto bg-black py-8 text-gray-300 border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-4 text-gray-300 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-8 text-gray-300 md:flex-row">
          <div className="flex items-center gap-3">
            <Linkedin className="h-5 w-5" />
            <a
              href="https://www.linkedin.com/in/mgraj"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gray-100"
            >
              Connect on LinkedIn
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5" />
            <span>contact.plamento@gmail.com</span>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-6 text-center text-gray-300">
          <p className="text-sm text-gray-400">
            &copy; 2024 Plamento. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
