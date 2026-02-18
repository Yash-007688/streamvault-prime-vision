import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Coins, Menu, X, LogOut, LayoutDashboard, Bell } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const notifications = [
  { id: 1, title: "Welcome to StreamVault! 🎉", desc: "You have 5 free tokens to get started.", time: "Just now" },
  { id: 2, title: "Token System Active", desc: "260p=1, 720p=2, 1080p=3, 4K=4 tokens.", time: "1 min ago" },
  { id: 3, title: "Download Complete ✅", desc: "Your last video was downloaded successfully.", time: "5 min ago" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { user, profile, isAdmin, signOut } = useAuth();

  const isLoggedIn = !!user;
  const tokens = profile?.tokens ?? 0;

  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 backdrop-blur-2xl"
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold gradient-text">StreamVault</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavItem to="/" active={isActive("/")}>Home</NavItem>
          <NavItem to="/pricing" active={isActive("/pricing")}>Pricing</NavItem>
          {isLoggedIn && (
            <>
              <NavItem to="/dashboard" active={isActive("/dashboard")}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </NavItem>
              {isAdmin && (
                <NavItem to="/admin" active={isActive("/admin")}>Admin</NavItem>
              )}
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {!isAuthPage && (
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-80 glass-card border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">Notifications</span>
                          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Mark all read</span>
                        </div>
                        <div className="divide-y divide-border/30">
                          {notifications.map((n) => (
                            <div key={n.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer">
                              <p className="text-sm font-medium text-foreground">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                              <p className="text-xs text-primary/60 mt-1">{n.time}</p>
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-2 border-t border-border/50 text-center">
                          <span className="text-xs text-muted-foreground">No more notifications</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="flex items-center gap-2 glass-card px-3 py-1.5 text-sm">
                <Coins className="h-4 w-4 text-accent" />
                <span className="font-semibold text-foreground">{tokens}</span>
                <span className="text-muted-foreground">tokens</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg transition-all hover:shadow-[0_0_20px_hsl(var(--glow-primary))]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-border/50 px-6 py-4 space-y-2"
        >
          <MobileNavItem to="/" onClick={() => setMobileOpen(false)}>Home</MobileNavItem>
          <MobileNavItem to="/pricing" onClick={() => setMobileOpen(false)}>Pricing</MobileNavItem>
          {isLoggedIn ? (
            <>
              <MobileNavItem to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</MobileNavItem>
              {isAdmin && (
                <MobileNavItem to="/admin" onClick={() => setMobileOpen(false)}>Admin</MobileNavItem>
              )}
              {!isAuthPage && (
                <div className="flex items-center gap-2 py-2 text-sm">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Notifications ({notifications.length})</span>
                </div>
              )}
              <div className="flex items-center gap-2 py-2 text-sm">
                <Coins className="h-4 w-4 text-accent" />
                <span className="font-semibold">{tokens} tokens</span>
              </div>
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <MobileNavItem to="/login" onClick={() => setMobileOpen(false)}>Sign In</MobileNavItem>
              <MobileNavItem to="/register" onClick={() => setMobileOpen(false)}>Get Started</MobileNavItem>
            </>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};

const NavItem = ({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) => (
  <Link
    to={to}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }`}
  >
    {children}
  </Link>
);

const MobileNavItem = ({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    {children}
  </Link>
);

export default Navbar;
