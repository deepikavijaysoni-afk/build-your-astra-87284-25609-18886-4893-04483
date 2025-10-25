import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-10 bg-black/80 backdrop-blur-sm border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#docs" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#tutorials" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  Tutorials
                </a>
              </li>
              <li>
                <a href="#blog" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  Blog
                </a>
              </li>
              <li>
                <a href="#api" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  About Us
                </a>
              </li>
              <li>
                <a href="#careers" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  Careers
                </a>
              </li>
              <li>
                <a href="#contact" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  Contact
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Social</h3>
            <div className="flex items-center gap-4">
              <a
                href="#github"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href="#twitter"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href="#linkedin"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href="#youtube"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
