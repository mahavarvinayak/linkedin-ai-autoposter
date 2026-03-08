"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Rocket, 
  Shield, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  BarChart3,
  Bot,
  Target
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1F242E] text-white">
      {/* Navbar */}
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 font-headline font-bold text-2xl text-[#2662D9]">
          <div className="w-10 h-10 rounded-xl bg-[#2662D9] flex items-center justify-center text-white">L</div>
          LinkFlow AI
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link href="#security" className="hover:text-white transition-colors">Security</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="text-white hover:text-white hover:bg-white/10">
            <Link href="/dashboard">Login</Link>
          </Button>
          <Button asChild className="bg-[#AD6BF0] hover:bg-[#AD6BF0]/90 text-white font-bold px-8 rounded-full shadow-lg shadow-[#AD6BF0]/20">
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-6 lg:px-12 py-24 lg:py-32 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#AD6BF0]/10 border border-[#AD6BF0]/20 text-[#AD6BF0] text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              Now powered by Gemini 2.5 Flash
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-extrabold mb-8 tracking-tight leading-tight">
              Automate your LinkedIn presence with <span className="text-[#2662D9]">Personal AI</span>
            </h1>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Generate and publish high-value, SEO-optimized LinkedIn content every single day on autopilot. Securely connected, personally controlled.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-[#2662D9] hover:bg-[#2662D9]/90 text-white font-bold px-10 h-14 rounded-full text-lg group">
                <Link href="/dashboard">
                  Connect LinkedIn <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 px-10 h-14 rounded-full text-lg">
                View Features
              </Button>
            </div>
          </div>
          
          {/* Background Blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2662D9] rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#AD6BF0] rounded-full blur-[120px]"></div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="px-6 lg:px-12 py-24 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-headline font-bold text-center mb-16">Supercharge your digital influence</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Bot,
                  title: "AI Generation Engine",
                  description: "Leverage Gemini or OpenAI with your own keys to create high-insight, conversational posts.",
                  color: "text-[#2662D9]"
                },
                {
                  icon: Zap,
                  title: "Daily Autopilot",
                  description: "Set your schedule once and LinkFlow will handle the daily publishing across all your pages.",
                  color: "text-[#AD6BF0]"
                },
                {
                  icon: Shield,
                  title: "Secure & Private",
                  description: "BYOK (Bring Your Own Key) ensures you own your data and API costs. Tokens are never exposed.",
                  color: "text-green-500"
                },
                {
                  icon: Target,
                  title: "Smart Targeting",
                  description: "Switch seamlessly between your personal profile and company pages with admin-level access.",
                  color: "text-blue-400"
                },
                {
                  icon: BarChart3,
                  title: "History & Status",
                  description: "Detailed logs of every post, success rate, and automated retry mechanism for failures.",
                  color: "text-purple-400"
                },
                {
                  icon: Rocket,
                  title: "SEO Optimized",
                  description: "Captions and hashtags are optimized for LinkedIn's algorithm to maximize your reach.",
                  color: "text-orange-400"
                }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                  <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 font-headline font-bold text-xl text-gray-400">
            <div className="w-6 h-6 rounded bg-gray-600 flex items-center justify-center text-white text-xs">L</div>
            LinkFlow AI
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Support</Link>
          </div>
          <div className="text-sm text-gray-600">
            © 2024 LinkFlow AI. For personal use.
          </div>
        </div>
      </footer>
    </div>
  )
}
