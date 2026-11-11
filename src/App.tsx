/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Church, BookOpen, Video, Info, Lock, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAdminAuth } from './lib/useAdminAuth';
import Home from './pages/Home';
import Sermons from './pages/Sermons';
import Bulletins from './pages/Bulletins';
import About from './pages/About';
import Admin from './pages/Admin';
import { cn } from './lib/utils';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user: currentUser, isAdmin } = useAdminAuth();

  const navItems = [
    { name: 'HOME', path: '/' },
    { name: '교회소개', path: '/about' },
    { name: '설교영상', path: '/sermons' },
    { name: '주보', path: '/bulletins' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border h-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-6 lg:px-12 h-full flex items-center justify-between gap-2 md:gap-4">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm bg-[#A5BC73] flex items-center justify-center shrink-0 border border-[#A5BC73]/30 group-hover:scale-105 transition-transform">
            <img 
              src="/church_logo_green.svg" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/church_logo_green.png';
              }}
              alt="멜번제자교회 심볼" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-brand-primary group-hover:text-brand-accent transition-colors leading-none mb-1 whitespace-nowrap">
              멜번제자교회
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.14em] lg:tracking-[0.2em] text-brand-sub whitespace-nowrap">
              Melbourne Disciple Korean Church
            </span>
          </div>
        </Link>

        {/* Desktop & Tablet Nav */}
        <div className="hidden md:flex items-center gap-3.5 md:gap-5 lg:gap-8 xl:gap-10 shrink-0">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "text-xs lg:text-[13px] font-medium tracking-wide transition-all border-b-2 whitespace-nowrap py-1",
                location.pathname === item.path 
                  ? "text-brand-accent border-brand-accent" 
                  : "text-brand-muted border-transparent hover:text-brand-accent"
              )}
            >
              {item.name}
            </Link>
          ))}
          {/* Admin Dashboard Link - Only visible when logged in as Admin */}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="ml-1 lg:ml-4 px-3 lg:px-4 py-1.5 border border-brand-primary text-[10px] lg:text-[11px] rounded-full hover:bg-brand-primary hover:text-white transition-all uppercase tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span>ADMIN DASHBOARD</span>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-brand-primary shrink-0" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-0 right-0 bg-brand-bg border-b border-brand-border md:hidden py-8 shadow-xl"
          >
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-12 py-4 text-sm font-medium tracking-wide",
                  location.pathname === item.path ? "text-brand-accent bg-white/50" : "text-brand-muted"
                )}
              >
                {item.name}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-4 px-12 py-4 text-sm font-medium text-brand-accent bg-white/60 border-t border-brand-border/40"
              >
                <Lock className="w-4 h-4 text-brand-accent" />
                <span>ADMIN DASHBOARD (관리자 대시보드)</span>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-[#F5F3EF] border-t border-brand-border py-10 sm:py-12 px-6 sm:px-8 md:px-12 mt-16 sm:mt-20">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-3.5 text-center lg:text-left">
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-xs bg-[#A5BC73] flex items-center justify-center shrink-0 border border-[#A5BC73]/30">
            <img 
              src="/church_logo_green.svg" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/church_logo_green.png';
              }}
              alt="멜번제자교회" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5">
            <h3 className="font-serif text-lg font-semibold text-brand-primary leading-tight whitespace-nowrap">멜번제자교회</h3>
            <p className="text-[10.5px] uppercase tracking-wider text-brand-sub whitespace-nowrap">Melbourne Disciple Korean Church</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-[11.5px] text-brand-sub">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-brand-primary inline-block w-[4.5rem]">ADDRESS</span>
            <span className="text-brand-muted">:</span>
            <span>245 Middleborough Rd, Box Hill South VIC 3128</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-brand-primary inline-block w-[4.5rem]">EMAIL</span>
            <span className="text-brand-muted">:</span>
            <a href="mailto:info@mkdc.org.au" className="hover:text-brand-accent transition-colors">info@mkdc.org.au</a>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-brand-primary inline-block w-[4.5rem]">TEL</span>
            <span className="text-brand-muted">:</span>
            <a href="tel:0401800109" className="hover:text-brand-accent transition-colors">0401 800 109</a>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#B2B2A5] text-center lg:text-right whitespace-nowrap">
          <span className="italic">© 2026 Melbourne Disciple Korean Church. All rights reserved.</span>
          <Link 
            to="/admin" 
            title="관리자 로그인" 
            className="text-[#B2B2A5]/60 hover:text-brand-accent transition-colors p-1"
          >
            <Lock className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sermons" element={<Sermons />} />
            <Route path="/bulletins" element={<Bulletins />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin/*" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
