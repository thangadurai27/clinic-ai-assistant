'use client'

import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import TrustBar from '@/components/landing/TrustBar'
import Stats from '@/components/landing/Stats'
import Features from '@/components/landing/Features'
import Workflow from '@/components/landing/Workflow'
import Dashboard from '@/components/landing/Dashboard'
import Comparison from '@/components/landing/Comparison'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function Page() {
  return (
    <div style={{ background: '#070B16', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Stats />
        <Features />
        <Workflow />
        <Dashboard />
        <Comparison />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
