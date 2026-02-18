import { Link } from "react-router-dom";
import { Download, Github, Instagram, Youtube, Mail } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl">
    <div className="container mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">StreamVault</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm">
            Premium YouTube video downloader with token-based access. Fast, secure, and ad-free experience.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 text-sm">Product</h4>
          <div className="space-y-2">
            <FooterLink to="/pricing">Pricing</FooterLink>
            <FooterLink to="/dashboard">Dashboard</FooterLink>
            <FooterLink to="/login">Sign In</FooterLink>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-3 text-sm">Legal</h4>
          <div className="space-y-2">
            <FooterLink to="#">Privacy Policy</FooterLink>
            <FooterLink to="#">Terms of Service</FooterLink>
            <FooterLink to="#">Contact</FooterLink>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} StreamVault. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-pink-400 transition-colors"
            title="Instagram"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-red-500 transition-colors"
            title="YouTube"
          >
            <Youtube className="h-4 w-4" />
          </a>
          <a
            href="mailto:support@streamvault.app"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Email"
          >
            <Mail className="h-4 w-4" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
    {children}
  </Link>
);

export default Footer;
