"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  CheckCircle2,
  ClipboardCheck,
  Wrench,
  Plug,
  Battery,
  Settings,
  Sparkles,
  Facebook,
  Phone,
} from "lucide-react";
import LandingHeader from "@/components/layout/LandingHeader";
import ChatBot from "@/components/ChatBot";
import ScrollToTop from "@/components/ScrollToTop";
import AnimatedSection from "@/components/landing/AnimatedSection";
import ParallaxImage from "@/components/landing/ParallaxImage";

const SERVICES = [
  {
    icon: ClipboardCheck,
    title: "Site Inspection",
    description: "Comprehensive energy audits to determine the optimal configuration for your property's solar potential.",
    shortDescription: "Energy audits and solar potential assessment.",
    startingPrice: "Free",
  },
  {
    icon: Wrench,
    title: "Solar Installation",
    description: "Professional rooftop panel fitting using the highest quality mounting systems and safety protocols.",
    shortDescription: "Professional rooftop panel installation.",
    startingPrice: "₱50,000",
  },
  {
    icon: Plug,
    title: "Commissioning",
    description: "Rigorous system testing and activation to ensure your panels are feeding maximum power to your home.",
    shortDescription: "System testing and activation.",
    startingPrice: "₱15,000",
  },
  {
    icon: Battery,
    title: "Inverter & Battery Setup",
    description: "Efficient energy storage solutions allowing you to use your solar power even after the sun goes down.",
    shortDescription: "Energy storage and battery solutions.",
    startingPrice: "₱80,000",
  },
  {
    icon: Settings,
    title: "Maintenance & Repair",
    description: "Ongoing system health checks and rapid repair services to keep your investment performing at its peak.",
    shortDescription: "Health checks and repair services.",
    startingPrice: "₱3,500",
  },
  {
    icon: Sparkles,
    title: "Professional Cleaning",
    description: "Maximizing efficiency through specialized panel care and dust removal using eco-friendly solutions.",
    shortDescription: "Specialized panel care and cleaning.",
    startingPrice: "₱2,500",
  },
];

const CAROUSEL_IMAGES = [
  {
    url: "/carousel1.jpg",
    alt: "Solar panels on modern home rooftop",
    headline: "Power Your Home with Clean Energy",
    subtext: "Reduce your electricity bills by up to 70% with premium solar installations",
  },
  {
    url: "/carousel2.jpg",
    alt: "Professional solar panel installation",
    headline: "Expert Installation, Lasting Results",
    subtext: "Trusted by hundreds of homeowners since 2019",
  },
  {
    url: "/carousel3.jpg",
    alt: "Solar array in sunny field",
    headline: "Invest in Your Future",
    subtext: "Maximize ROI with high-efficiency panels and expert maintenance",
  },
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <LandingHeader />

      {/* Hero Carousel */}
      <section id="home" className="relative h-[85vh] min-h-[500px] overflow-hidden">
        {CAROUSEL_IMAGES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
          >
            <ParallaxImage className="absolute inset-0" speed={0.25}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.url}
                alt={slide.alt}
                className="w-full h-full object-cover min-h-[500px]"
              />
            </ParallaxImage>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
                <div className="max-w-2xl">
                  <AnimatePresence mode="wait">
                    {index === currentSlide && (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4">
                          {slide.headline}
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-200 mb-8 max-w-xl">
                          {slide.subtext}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href="/client/booking"
                              className="inline-flex items-center justify-center px-8 py-4 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-lg hover:shadow-xl"
                            >
                              Book Now
                            </Link>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href="/#services"
                              className="inline-flex items-center justify-center px-8 py-4 bg-white/15 backdrop-blur-sm border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/25 transition-colors"
                            >
                              Explore Our Services
                            </Link>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        ))}

        <motion.button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 flex items-center justify-center text-white border border-white/30 transition-colors"
          aria-label="Previous slide"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="h-6 w-6" />
        </motion.button>
        <motion.button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 flex items-center justify-center text-white border border-white/30 transition-colors"
          aria-label="Next slide"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight className="h-6 w-6" />
        </motion.button>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {CAROUSEL_IMAGES.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full ${index === currentSlide ? "bg-brand" : "bg-white/40 hover:bg-white/60"
                }`}
              animate={{ width: index === currentSlide ? 32 : 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              aria-label={`Go to slide ${index + 1}`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </section>



      {/* About GreenSky Solar */}
      <section id="about" className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <AnimatedSection className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
              About GreenSky Solar
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              Since 2019, GreenSky Solar has been leading the transition to sustainable energy across the Philippines. We combine premium solar technology with expert installation and dedicated after-sales support to help homeowners and businesses reduce their electricity bills and their carbon footprint.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Our team of certified technicians handles everything from free site inspection to system activation—including permits and paperwork. We stand behind every installation with industry-leading warranties and ongoing maintenance, so your investment delivers lasting savings for years to come.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Our Services */}
      <section id="services" className="py-16 sm:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Our Services
            </h2>
            <p className="text-slate-600 text-lg">
              From initial consultation to long-term maintenance, we provide end-to-end solar services tailored to your needs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service) => (
              <Link
                key={service.title}
                href="/#services"
                className="group bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-brand/20 transition-all"
              >
                <div className="w-14 h-14 bg-brand/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand group-hover:text-white transition-colors">
                  <service.icon className="h-7 w-7 text-brand group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-brand transition-colors">
                  {service.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Why Choose Us */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <AnimatedSection className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Why Homeowners Choose GreenSky Solar
            </h2>
            <p className="text-slate-600 text-lg">
              We make switching to solar simple, transparent, and rewarding.
            </p>
          </AnimatedSection>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.1, delayChildren: 0.1 },
              },
            }}
          >
            {[
              {
                icon: Zap,
                title: "Save Up to 70% on Bills",
                desc: "Dramatically reduce your electricity costs with high-efficiency panels and smart system design.",
              },
              {
                icon: Shield,
                title: "Warranty & Support",
                desc: "Industry-leading warranties and dedicated after-sales support to protect your investment.",
              },
              {
                icon: CheckCircle2,
                title: "Hassle-Free Process",
                desc: "From free site inspection to activation—we handle permits, installation, and paperwork.",
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-brand/20"
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className="w-14 h-14 bg-brand/10 rounded-xl flex items-center justify-center mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <item.icon className="h-7 w-7 text-brand" />
                </motion.div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-24 bg-brand overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          }}
        />
        <div className="container relative mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Go Solar?
            </h2>
            <p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
              Get a free, no-obligation site inspection. Our experts will assess your property and provide a custom quote within 48 hours.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/client/booking"
                className="inline-flex items-center justify-center px-10 py-4 bg-white text-brand font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-lg ring-4 ring-white/20"
              >
                Get My Free Quote
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <ChatBot />
      <ScrollToTop />

      {/* Footer */}
      <footer className="py-14 bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center">
              <Link href="/" className="flex justify-center shrink-0">
                <Image
                  src="/logo_greensky.png"
                  alt="GreenSky Solar Energy"
                  width={240}
                  height={72}
                  className="h-24 w-auto object-contain opacity-95"
                />
              </Link>
              <p className="mt-3 text-sm text-slate-400 max-w-xs text-center">
                Sustainable energy solutions for your home since 2019.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
              <div className="flex flex-col gap-2">
                {[
                  { href: "/#about", label: "About" },
                  { href: "/#services", label: "Services" },
                  { href: "/prices", label: "Prices" },
                  { href: "/login", label: "Login" },
                ].map((link) => (
                  <motion.div key={link.href} whileHover={{ x: 4 }}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 hover:text-white transition-colors inline-block border-b border-transparent hover:border-white"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Follow Us</h4>
              <div className="flex gap-3">
                <motion.a
                  href="https://www.facebook.com/t0nt0n123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/50 text-white hover:bg-brand transition-colors"
                  aria-label="Facebook"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Facebook className="h-5 w-5" />
                </motion.a>
                <motion.a
                  href="https://www.tiktok.com/@greenskysolar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/50 text-white hover:bg-slate-600 transition-colors"
                  aria-label="TikTok"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88 0V7.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </motion.a>
              </div>
              <p className="mt-3 text-xs text-slate-400">Stay updated with our latest projects</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Call Us</h4>
              <a
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0" />
                +63 912 345 6789
              </a>
              <p className="mt-1 text-xs text-slate-400">Mon–Sat, 8AM–6PM</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800">
            <p className="text-sm text-slate-500 text-center">
              © {new Date().getFullYear()} GreenSky Solar. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
