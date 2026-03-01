"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const TESTIMONIALS = [
  {
    quote:
      "GreenSky made the whole process seamless. From the free site inspection to installation, everything was professional and on schedule. Our electricity bills have dropped by 65%!",
    name: "Maria R.",
    location: "Quezon City",
  },
  {
    quote:
      "Best investment we've made for our home. The team was knowledgeable, courteous, and the after-sales support is excellent. Highly recommend GreenSky Solar.",
    name: "Roberto S.",
    location: "Laguna",
  },
  {
    quote:
      "Switching to solar was easier than I thought. GreenSky handled all the permits and paperwork. Six months in and we're already seeing significant savings.",
    name: "Ana L.",
    location: "Cavite",
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 sm:py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <AnimatedSection className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-slate-600 text-lg">
            Join hundreds of satisfied homeowners who have made the switch to solar.
          </p>
        </AnimatedSection>

        <AnimatedSection className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm min-h-[220px]">
            <Quote className="absolute top-6 left-6 h-10 w-10 text-brand/20" />
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <p className="text-lg sm:text-xl text-slate-700 leading-relaxed mb-6 pl-4">
                  &ldquo;{TESTIMONIALS[current].quote}&rdquo;
                </p>
                <p className="font-semibold text-slate-900">{TESTIMONIALS[current].name}</p>
                <p className="text-sm text-slate-500">{TESTIMONIALS[current].location}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`h-2 rounded-full transition-all ${index === current ? "w-8 bg-brand" : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
