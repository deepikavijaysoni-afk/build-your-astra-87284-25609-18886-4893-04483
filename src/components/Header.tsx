import astraLogo from '@/assets/astra-logo.png';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <img src={astraLogo} alt="ASTRA.DEV" className="h-32" />
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#community" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Community
          </a>
          <a href="#enterprise" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Enterprise
          </a>
          <a href="#resources" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Resources
          </a>
          <a href="#careers" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Careers
          </a>
          <a href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Pricing
          </a>
        </nav>
      </div>
    </header>
  );
}
