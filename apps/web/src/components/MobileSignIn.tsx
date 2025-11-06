import { ArrowLeft } from "lucide-react";
import { SignInForm } from "../SignInForm";

interface MobileSignInProps {
  onBack: () => void;
  onSignUpLink: () => void;
}

export function MobileSignIn({ onBack, onSignUpLink }: MobileSignInProps) {
  return (
    <div className="min-h-screen mobile-auth-gradient flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-4 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="iTimedIT" className="h-8 w-8" />
            <span className="text-lg font-semibold text-slate-900">iTimedIT</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-600">Sign in to continue tracking your time</p>
          </div>

          <div className="mobile-auth-card">
            <SignInForm defaultFlow="signIn" />
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-slate-600">
              Don't have an account?{" "}
              <button
                onClick={onSignUpLink}
                className="text-orange-600 font-semibold hover:text-orange-700 active:text-orange-800 transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
