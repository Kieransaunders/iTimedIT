import { Clock, DollarSign, Users, Timer } from "lucide-react";

interface MobileLandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onGuestMode: () => void;
}

export function MobileLandingPage({ onSignIn, onSignUp, onGuestMode }: MobileLandingPageProps) {
  return (
    <div className="min-h-screen mobile-landing-gradient flex flex-col">
      {/* Hero Section */}
      <header className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 text-center">
        <div className="mb-8">
          <img
            src="/icon.png"
            alt="iTimedIT"
            className="h-20 w-20 mx-auto mb-4 drop-shadow-lg"
          />
          <h1 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
            iTimedIT
          </h1>
          <p className="text-lg font-semibold text-slate-700 mb-2">
            Professional time tracking made simple
          </p>
          <p className="text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Track time efficiently, manage project budgets, and stay focused on what matters most.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="w-full max-w-md space-y-3 mb-8">
          <FeatureCard
            icon={<Clock className="w-6 h-6 text-orange-600" />}
            title="One-Tap Timer Start"
            description="Start tracking instantly with quick project selection"
          />
          <FeatureCard
            icon={<DollarSign className="w-6 h-6 text-yellow-600" />}
            title="Budget Tracking"
            description="Monitor project budgets with real-time alerts"
          />
          <FeatureCard
            icon={<Timer className="w-6 h-6 text-purple-600" />}
            title="Pomodoro Mode"
            description="Stay productive with built-in focus timer"
          />
          <FeatureCard
            icon={<Users className="w-6 h-6 text-green-600" />}
            title="Team Collaboration"
            description="Track time across your entire organization"
          />
        </div>
      </header>

      {/* CTA Buttons */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={onSignUp}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-4 rounded-xl transition-colors shadow-lg shadow-orange-500/30"
        >
          Get Started
        </button>
        <button
          onClick={onSignIn}
          className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-orange-600 font-semibold py-4 rounded-xl transition-colors border-2 border-orange-500"
        >
          Sign In
        </button>
        <button
          onClick={onGuestMode}
          className="w-full text-slate-600 hover:text-slate-900 font-medium py-3 transition-colors"
        >
          Try as Guest
        </button>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mobile-feature-card">
      <div className="flex items-start gap-4">
        <div className="mobile-feature-icon">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-600 leading-snug">{description}</p>
        </div>
      </div>
    </div>
  );
}
