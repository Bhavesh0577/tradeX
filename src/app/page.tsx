"use client";

import React, { useState, useEffect } from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart2, TrendingUp, DollarSign, PieChart, Search, Menu, X } from "lucide-react";
import '../app/globals.css';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll event to change navbar background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-black/80 backdrop-blur-md py-3" : "bg-transparent py-5"
          }`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-purple-500" />
            <span className="text-xl font-bold">Fintola</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="hover:text-purple-400 transition-colors">
              Features
            </Link>
            <Link href="#about" className="hover:text-purple-400 transition-colors">
              About
            </Link>
            <Link href="#testimonials" className="hover:text-purple-400 transition-colors">
              Testimonials
            </Link>
            <Link
              href="/dash"
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full transition-colors flex items-center gap-2"
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md absolute top-full left-0 right-0 p-4 flex flex-col gap-4">
            <Link
              href="#features"
              className="hover:text-purple-400 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#about"
              className="hover:text-purple-400 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="#testimonials"
              className="hover:text-purple-400 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Testimonials
            </Link>
            <Link
              href="/dash"
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Advanced Stock Analysis with <span className="text-purple-500">AI Predictions</span>
            </motion.h1>
            <motion.p
              className="text-xl text-gray-300 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Get real-time market data, AI-powered insights, and advanced charting tools to make smarter investment decisions.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link
                href="/sign-in"
                className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-full text-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                Try Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section with Scroll Animation */}
      <section id="features" className="py-20">
        <ContainerScroll
          titleComponent={
            <h2 className="text-3xl md:text-5xl font-bold mb-10">
              Powered by <span className="text-purple-500">Google Gemini AI</span> for Accurate Predictions
            </h2>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full">
            <div className="relative h-full w-full overflow-hidden rounded-2xl">
              <Image
                src="/stock-chart.jpg"
                alt="Stock Chart"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-2xl font-bold mb-2">Real-time Market Data</h3>
                <p className="text-gray-300">Access live stock prices, charts, and market indicators from global exchanges.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-6">
                <TrendingUp className="h-10 w-10 text-purple-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">AI-Powered Predictions</h3>
                <p className="text-gray-300">Get buy/sell signals generated by Google's Gemini Flash 1.5 AI model.</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-6">
                <BarChart2 className="h-10 w-10 text-purple-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Advanced Technical Analysis</h3>
                <p className="text-gray-300">Apply multiple indicators like SMA, EMA, and more to your charts.</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-6">
                <PieChart className="h-10 w-10 text-purple-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Portfolio Management</h3>
                <p className="text-gray-300">Track your investments and analyze performance over time.</p>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-b from-black to-purple-950/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6">About Fintola</h2>
              <p className="text-xl text-gray-300">Our mission is to democratize financial analysis with cutting-edge technology.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-4">Why Choose Fintola?</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="bg-purple-500 rounded-full p-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">AI-Powered Analysis</h4>
                      <p className="text-gray-400">Our platform leverages Google's Gemini AI to provide accurate market predictions.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-purple-500 rounded-full p-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Real-time Data</h4>
                      <p className="text-gray-400">Access up-to-the-minute information from global markets and exchanges.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-purple-500 rounded-full p-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Focus on Indian Markets</h4>
                      <p className="text-gray-400">Specialized tools and data for NSE, BSE, and Indian stocks.</p>
                    </div>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="relative h-[400px] rounded-2xl overflow-hidden"
              >
                <Image
                  src="/trading-desk.jpg"
                  alt="Trading Desk"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-purple-900/40"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">What Our Users Say</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">Join thousands of traders who trust Fintola for their investment decisions.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{testimonial.name}</h4>
                    <p className="text-gray-400 text-sm">{testimonial.title}</p>
                  </div>
                </div>
                <p className="text-gray-300">{testimonial.quote}</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-t from-black to-purple-950/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              className="text-3xl md:text-5xl font-bold mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Ready to Transform Your Trading?
            </motion.h2>
            <motion.p
              className="text-xl text-gray-300 mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Join Fintola today and experience the power of AI-driven stock analysis.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Link
                href="/dash"
                className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-full text-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <DollarSign className="h-6 w-6 text-purple-500" />
              <span className="text-lg font-bold">Fintola</span>
            </div>
            <div className="flex gap-6">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Fintola. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Testimonial data
const testimonials = [
  {
    name: "Rajesh Kumar",
    title: "Day Trader",
    avatar: "/avatar-1.jpg",
    quote: "The AI predictions have completely transformed my trading strategy. I've seen a 32% increase in my portfolio since using Fintola."
  },
  {
    name: "Priya Sharma",
    title: "Investment Analyst",
    avatar: "/avatar-2.jpg",
    quote: "As a professional analyst, I appreciate the depth of technical indicators available. The Gemini AI integration is a game-changer."
  },
  {
    name: "Vikram Singh",
    title: "Retail Investor",
    avatar: "/avatar-3.jpg",
    quote: "Fintola makes stock analysis accessible even for beginners like me. The interface is intuitive and the AI recommendations are spot on."
  }
]; 