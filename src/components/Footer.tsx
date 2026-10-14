import React from 'react';
import { Shield, FileText, Mail, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'privacy' | 'terms' | 'app') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Immersive Adaptive Tutor</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-500 fill-current inline" /> for adaptive learning
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/privacy');
              onNavigate('privacy');
            }}
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            Privacy Policy
          </a>

          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/terms');
              onNavigate('terms');
            }}
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            Terms of Service
          </a>

          <a
            href="mailto:trandangai@gmail.com"
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            Contact Support
          </a>
        </div>
      </div>
    </footer>
  );
};
