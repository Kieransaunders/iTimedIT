import { Clock, DollarSign, Timer, BarChart3, Users, RefreshCw } from "lucide-react";

interface DesktopLandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onGuestMode: () => void;
}

export function DesktopLandingPage({ onSignIn, onSignUp, onGuestMode }: DesktopLandingPageProps) {
  return (
    <div className="min-h-screen desktop-landing-gradient">
      {/* Navigation */}
      <nav className="desktop-nav">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="iTimedIT" className="h-10 w-10" />
            <span className="text-xl font-semibold text-slate-900">iTimedIT</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onSignIn}
              className="px-6 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="desktop-hero-section">
        <div className="max-w-5xl mx-auto px-8 py-24 text-center">
          <div className="mb-6">
            <img
              src="/icon.png"
              alt="iTimedIT"
              className="h-20 w-20 mx-auto mb-6 drop-shadow-lg animate-fade-in"
            />
          </div>

          <h1 className="desktop-hero-headline animate-fade-in-up">
            Professional Time Tracking
            <br />
            <span className="desktop-hero-headline-accent">Made Simple</span>
          </h1>

          <p className="desktop-hero-subtitle animate-fade-in-up-delay">
            Track time efficiently, manage project budgets, and stay focused on
            <br />
            what matters most to your business.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10 animate-fade-in-up-delay-2">
            <button
              onClick={onSignUp}
              className="desktop-cta-primary"
            >
              Get Started Free
            </button>
            <button
              onClick={onSignIn}
              className="desktop-cta-secondary"
            >
              Sign In
            </button>
            <button
              onClick={onGuestMode}
              className="desktop-cta-ghost"
            >
              Try as Guest
            </button>
          </div>

          <p className="mt-6 text-sm text-slate-500 animate-fade-in-up-delay-3">
            No credit card required • Free forever for personal use
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-4xl font-bold text-slate-900 mb-4">
            Everything you need to track time
          </h2>
          <p className="text-center text-xl text-slate-600 mb-16 max-w-2xl mx-auto">
            Powerful features designed for individuals and teams who value their time
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="w-7 h-7" />}
              title="Real-Time Tracking"
              description="Start and stop timers instantly. Track time across multiple projects with ease."
              color="orange"
            />
            <FeatureCard
              icon={<DollarSign className="w-7 h-7" />}
              title="Budget Management"
              description="Set project budgets and get alerts when approaching limits. Track profitability in real-time."
              color="green"
            />
            <FeatureCard
              icon={<Timer className="w-7 h-7" />}
              title="Pomodoro Timer"
              description="Built-in focus mode with customizable work and break intervals. Stay productive effortlessly."
              color="purple"
            />
            <FeatureCard
              icon={<BarChart3 className="w-7 h-7" />}
              title="Detailed Reports"
              description="Analyze your time usage with comprehensive reports and visualizations."
              color="blue"
            />
            <FeatureCard
              icon={<Users className="w-7 h-7" />}
              title="Team Collaboration"
              description="Invite team members, assign projects, and manage permissions across your organization."
              color="indigo"
            />
            <FeatureCard
              icon={<RefreshCw className="w-7 h-7" />}
              title="Cross-Platform Sync"
              description="Seamlessly sync between web and mobile. Access your data anywhere, anytime."
              color="teal"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-500 text-sm">
            © 2025 iTimedIT. Trusted by professionals worldwide • Secure • Reliable • Efficient
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "orange" | "green" | "purple" | "blue" | "indigo" | "teal";
}) {
  const colorClasses = {
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    teal: "bg-teal-50 text-teal-600",
  };

  return (
    <div className="desktop-feature-card group">
      <div className={`desktop-feature-icon ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
