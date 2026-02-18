import { motion } from "framer-motion";
import { Check, Zap, Crown, Rocket } from "lucide-react";

const plans = [
  {
    name: "Starter Pack",
    tokens: 20,
    price: "₹199",
    icon: Zap,
    popular: false,
    features: ["20 Download Tokens", "All Quality Options", "Standard Support", "No Expiry"],
  },
  {
    name: "Pro Pack",
    tokens: 100,
    price: "₹699",
    icon: Crown,
    popular: true,
    features: ["100 Download Tokens", "All Quality Options", "Priority Support", "No Expiry", "Best Value"],
  },
  {
    name: "Ultra Pack",
    tokens: 500,
    price: "₹2,499",
    icon: Rocket,
    popular: false,
    features: ["500 Download Tokens", "All Quality Options", "Dedicated Support", "No Expiry", "Bulk Discount"],
  },
];

const Pricing = () => {
  return (
    <div className="animated-gradient-bg min-h-screen pt-32 pb-20 px-6">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, <span className="gradient-text">Token-Based</span> Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No subscriptions. Buy tokens, download videos. It's that simple.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`relative glass-card-hover p-8 flex flex-col ${
                plan.popular ? "border-primary/40 shadow-[0_0_40px_hsl(var(--glow-primary))]" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  plan.popular ? "bg-primary/20" : "bg-secondary"
                }`}>
                  <plan.icon className={`h-5 w-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.tokens} tokens</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className={`h-4 w-4 flex-shrink-0 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--glow-primary))]"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
              >
                Buy {plan.tokens} Tokens
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
