import Link from 'next/link';
import { Button } from '@stemverse/ui';
import { ThemeToggle } from '@/components/theme-toggle';

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-bold text-primary">
          STEMVerse
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/features" className="text-muted hover:text-foreground">Features</Link>
          <Link href="/community" className="text-muted hover:text-foreground">Community</Link>
          <Link href="/pricing" className="text-muted hover:text-foreground">Pricing</Link>
          <Link href="/docs" className="text-muted hover:text-foreground">Docs</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link href="/login" className="hidden text-sm text-muted sm:inline hover:text-foreground">
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-4">
        <div>
          <p className="font-display font-bold text-primary">STEMVerse</p>
          <p className="mt-2 text-sm text-muted">Visual programming to industrial automation — one platform.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li><Link href="/features">Features</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/community">Community</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Resources</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li><Link href="/docs">Documentation</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Legal</p>
          <p className="mt-2 text-sm text-muted">© {new Date().getFullYear()} STEMVerse</p>
        </div>
      </div>
    </footer>
  );
}
