import Link from "next/link";
import LandingHeader from "@/components/layout/LandingHeader";
import ChatBot from "@/components/ChatBot";
import ScrollToTop from "@/components/ScrollToTop";
import { Check } from "lucide-react";

const gridtiePackages = [
  {
    capacity: "3.4KW",
    price: 137000,
    badge: "STARTER" as const,
    badgeStyle: "bg-green-100 text-green-800",
    description: "Perfect for small households with bills around ₱3k-5k.",
    features: [
      "Approx. ₱5k monthly savings",
      "10 x 550W Mono Perc Panels",
      "1 x 3.4KW Growatt Inverter",
      "Standard Mounting Kit",
    ],
    popular: false,
  },
  {
    capacity: "5.5KW",
    price: 167000,
    badge: "MOST POPULAR" as const,
    badgeStyle: "bg-amber-400 text-white",
    description: "Ideal for medium homes with AC units.",
    features: [
      "Approx. ₱9k monthly savings",
      "16 x 550W Mono Perc Panels",
      "1 x 5KW Growatt Inverter",
      "Premium Aluminum Rails",
    ],
    popular: true,
  },
  {
    capacity: "6.2KW",
    price: 175000,
    badge: null,
    badgeStyle: "",
    description: "Great for growing families.",
    features: [
      "Approx. ₱10k monthly savings",
      "18 x 550W Mono Perc Panels",
      "1 x 6KW Growatt Inverter",
      "Premium Aluminum Rails",
    ],
    popular: false,
  },
  {
    capacity: "7.4KW",
    price: 200000,
    badge: null,
    badgeStyle: "",
    description: "For homes with higher energy needs.",
    features: [
      "Approx. ₱12k monthly savings",
      "20 x 550W Mono Perc Panels",
      "1 x 7.4KW Growatt Inverter",
      "Premium Aluminum Rails",
    ],
    popular: false,
  },
  {
    capacity: "8.6KW",
    price: 230000,
    badge: null,
    badgeStyle: "",
    description: "Suits larger residences.",
    features: [
      "Approx. ₱14k monthly savings",
      "24 x 550W Mono Perc Panels",
      "1 x 8KW Growatt Inverter",
      "Premium Aluminum Rails",
    ],
    popular: false,
  },
  {
    capacity: "9.9KW",
    price: 250000,
    badge: null,
    badgeStyle: "",
    description: "For high daytime consumption.",
    features: [
      "Approx. ₱15k monthly savings",
      "28 x 550W Mono Perc Panels",
      "1 x 10KW Growatt Inverter",
      "Full Net Metering Support",
    ],
    popular: false,
  },
  {
    capacity: "10.5KW",
    price: 300000,
    badge: "PREMIUM" as const,
    badgeStyle: "bg-slate-800 text-white",
    description: "For large residences with high daytime consumption.",
    features: [
      "Approx. ₱16k monthly savings",
      "24 x 550W Mono Perc Panels",
      "1 x 10KW Growatt Inverter",
      "Full Net Metering Support",
    ],
    popular: false,
  },
];

const hybridPackages = [
  { capacity: "3.4KW", panels: "10 Panels", options: { "110AH": 218000, "220AH": 248000, "330AH": 310000 } },
  { capacity: "5.5KW", panels: "14 Panels", options: { "110AH": 254000, "220AH": 297000, "330AH": 290000 }, popularCell: "220AH" },
  { capacity: "6.2KW", panels: "16 Panels", options: { "110AH": 267700, "220AH": 307000, "330AH": 310000 } },
  { capacity: "7.4KW", panels: "20 Panels", options: { "110AH": 277000, "220AH": 307000, "330AH": 332000 } },
  { capacity: "8.6KW", panels: "22 Panels", options: { "110AH": 319000, "220AH": 349000, "330AH": 374000 } },
  { capacity: "9.9KW", panels: "24 Panels", options: { "220AH": 375000, "330AH": 400000 } },
  { capacity: "10.5KW", panels: "24 Panels", options: { "220AH": 426000, "330AH": 451000 } },
];

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PricesPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <LandingHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        {/* Grid-Tie Packages */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900">Grid-Tie Packages</h2>
          <p className="mt-2 text-slate-600">
            Connect to the grid and reduce your monthly electric bill significantly.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gridtiePackages.map((pkg) => (
              <article
                key={pkg.capacity}
                className={`relative rounded-xl border bg-white p-6 shadow-sm ${
                  pkg.popular ? "border-brand ring-2 ring-brand/30" : "border-slate-200"
                }`}
              >
                {pkg.badge && pkg.popular && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pkg.badgeStyle}`}
                  >
                    {pkg.badge}
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    {pkg.capacity} Grid-Tie
                  </h3>
                  {pkg.badge && !pkg.popular && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${pkg.badgeStyle}`}
                    >
                      {pkg.badge}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">
                    {formatPrice(pkg.price)}
                  </span>
                  <span className="text-sm text-slate-500">/system</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{pkg.description}</p>
                <Link
                  href="/client/booking"
                  className={`mt-4 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    pkg.popular
                      ? "bg-brand text-white hover:bg-brand-dark"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  Select Plan
                </Link>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  {pkg.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Hybrid Packages */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900">Hybrid Packages</h2>
          <p className="mt-2 text-center text-slate-600 max-w-2xl mx-auto">
            Combine solar savings with energy security. Prices vary based on your system size and required battery backup capacity.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className="pb-4 pr-6 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                      System Size
                    </th>
                    <th className="pb-4 px-4 text-left">
                      <span className="text-sm font-bold text-brand">110AH Battery</span>
                      <p className="text-xs font-normal text-slate-500 mt-0.5">
                        Basic Backup (Lights/Fans)
                      </p>
                    </th>
                    <th className="pb-4 px-4 text-left">
                      <span className="text-sm font-bold text-brand">220AH Battery</span>
                      <p className="text-xs font-normal text-slate-500 mt-0.5">
                        Extended Backup (Fridge/TV)
                      </p>
                    </th>
                    <th className="pb-4 px-4 text-left">
                      <span className="text-sm font-bold text-brand">330AH Battery</span>
                      <p className="text-xs font-normal text-slate-500 mt-0.5">
                        Premium Backup (Overnight)
                      </p>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hybridPackages.map((pkg) => (
                    <tr
                      key={pkg.capacity}
                      className="border-t border-slate-100"
                    >
                      <td className="py-4 pr-6">
                        <div className="font-bold text-slate-900">
                          {pkg.capacity} Hybrid
                        </div>
                        <div className="text-sm text-slate-500">{pkg.panels}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand">
                          <Check className="h-4 w-4" />
                          1 YEAR WORKMANSHIP
                        </div>
                      </td>
                      {(["110AH", "220AH", "330AH"] as const).map((battery) => {
                        const price = pkg.options[battery as keyof typeof pkg.options];
                        const isPopular = pkg.popularCell === battery;
                        return (
                          <td key={battery} className="py-4 px-4">
                            {price ? (
                              <div className="relative">
                                {isPopular && (
                                  <span className="absolute -top-1 -right-1 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    POPULAR
                                  </span>
                                )}
                                <span
                                  className={`font-semibold text-brand ${isPopular ? "font-bold" : ""}`}
                                >
                                  {formatPrice(price)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <ChatBot />
        <ScrollToTop />

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-brand p-8 text-center text-white">
          <h3 className="text-xl font-bold">Ready to get started?</h3>
          <p className="mt-2 text-white/90">
            Book a free site inspection for a custom quote.
          </p>
          <Link
            href="/client/booking"
            className="mt-4 inline-block px-6 py-3 bg-white text-brand font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            Book Free Inspection
          </Link>
        </div>
      </main>
    </div>
  );
}
