import React from 'react';
import Link from 'next/link';

export default function WebsiteFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-white text-sm">Shaarvik Technologies LLP</span>
                <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Building Smart Digital Solutions</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              We build powerful SaaS products that simplify business operations for modern enterprises.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', href: '/website' },
                { label: 'Products', href: '/website/products' },
                { label: 'About', href: '/website/about' },
                { label: 'Contact', href: '/website/contact' },
              ]?.map((link) => (
                <li key={link?.href}>
                  <Link href={link?.href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products & Contact */}
          <div>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">Products</h4>
            <ul className="space-y-2.5 mb-6">
              <li>
                <Link href="https://buildarya.com/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Buildarya
                </Link>
              </li>
              <li>
                <a
                  href="https://app.shaarvik.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Login to App
                </a>
              </li>
            </ul>
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Contact</h4>
            <p className="text-sm text-gray-500">hello@shaarvik.com</p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © {new Date()?.getFullYear()} Shaarvik Technologies LLP. All rights reserved.
          </p>
          <p className="text-xs text-gray-700">Built with purpose. Designed for growth.</p>
        </div>
      </div>
    </footer>
  );
}
