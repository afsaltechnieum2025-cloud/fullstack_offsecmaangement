import logo from '@/assets/technieum-logo.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm py-4 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Technieum" className="h-10 w-auto" />
          <span className="text-sm font-medium text-muted-foreground">OffSec Operations</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {currentYear} Technieum. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
