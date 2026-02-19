import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Shield, Zap, Download, Star } from "lucide-react";
import { useEffect, useState } from "react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Download videos in seconds with our optimized servers.",
  },
  {
    icon: Shield,
    title: "100% Secure",
    description: "End-to-end encryption. No ads, no tracking, no malware.",
  },
  {
    icon: Download,
    title: "Multiple Qualities",
    description: "Choose from 260p, 720p, 1080p or crystal clear 4K downloads.",
  },
  {
    icon: Star,
    title: "Completely Free",
    description: "No tokens, no subscriptions, no hidden fees. Just unlimited downloads.",
  },
];

const TYPING_PHRASES = ["Fast. Secure. Premium.", "No Ads. No Limits.", "Download in 4K.", "Always Free."];

const useTypingEffect = (phrases: string[], typingSpeed = 60, deletingSpeed = 35, pauseMs = 1800) => {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];

    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), typingSpeed);
      return () => clearTimeout(t);
    }

    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }

    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx((c) => c - 1), deletingSpeed);
      return () => clearTimeout(t);
    }

    if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }
  }, [charIdx, deleting, phraseIdx, phrases, typingSpeed, deletingSpeed, pauseMs]);

  useEffect(() => {
    setDisplayed(phrases[phraseIdx].slice(0, charIdx));
  }, [charIdx, phraseIdx, phrases]);

  return displayed;
};

const Index = () => {
  const typedText = useTypingEffect(TYPING_PHRASES);

  return (
    <div className="animated-gradient-bg min-h-screen">
      {/* Hero Section */}
      <section className="relative hero-glow pt-32 pb-20 px-6">
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 glass-card px-4 py-1.5 mb-8 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-accent" />
              Trusted by 10,000+ users worldwide
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
              Download YouTube Videos.
              <br />
              <span className="gradient-text glow-text">
                {typedText}
                <span className="inline-block w-0.5 h-[0.85em] bg-primary ml-1 align-middle animate-pulse" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Download videos in high quality with zero ads.
              No subscriptions, no fees — just pure, premium downloading.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_hsl(var(--glow-primary))] text-base"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          {/* Mock preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 max-w-4xl mx-auto glass-card p-1 animate-glow-pulse"
          >
            <div className="rounded-[calc(var(--radius)-4px)] bg-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-accent/40" />
                <div className="h-3 w-3 rounded-full bg-primary/40" />
                <div className="ml-4 flex-1 h-8 rounded-lg bg-secondary flex items-center px-4">
                  <span className="text-xs text-muted-foreground">https://youtube.com/watch?v=...</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 h-48 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Play className="h-12 w-12 text-primary/30" />
                </div>
                <div className="space-y-3">
                  <div className="h-6 rounded bg-secondary/50 w-full" />
                  <div className="h-4 rounded bg-secondary/30 w-3/4" />
                  <div className="h-4 rounded bg-secondary/30 w-1/2" />
                  <div className="mt-6 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xs text-primary font-medium">Download 1080p</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why choose <span className="gradient-text">StreamVault</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              The premium experience you deserve, without the clutter.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-hover p-6 group"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
                Ready to Start?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of users downloading videos for free.
                No credit card required.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-[0_0_40px_hsl(var(--glow-primary))]"
              >
                Start Downloading Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
