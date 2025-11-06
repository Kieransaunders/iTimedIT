import { ArrowLeft } from "lucide-react";
import { SignInForm } from "../SignInForm";

interface DesktopSignUpProps {
  onBack: () => void;
  onSignInLink: () => void;
}

export function DesktopSignUp({ onBack, onSignInLink }: DesktopSignUpProps) {
  return (
    <div className="min-h-screen desktop-auth-gradient">
      {/* Back Button */}
      <div className="absolute top-8 left-8 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </button>
      </div>

      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center px-16 bg-gradient-to-br from-orange-50 to-white">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <img src="/icon.png" alt="iTimedIT" className="h-12 w-12" />
              <span className="text-2xl font-bold text-slate-900">iTimedIT</span>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Start tracking your time today
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Join thousands of professionals who trust iTimedIT for their time tracking needs.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Free to get started</p>
                  <p className="text-sm text-slate-600">No credit card required</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Set up in minutes</p>
                  <p className="text-sm text-slate-600">Start tracking immediately</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Cancel anytime</p>
                  <p className="text-sm text-slate-600">No long-term commitment</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
              <p className="text-slate-600">Get started with iTimedIT</p>
            </div>

            <div className="desktop-auth-card">
              <SignInForm defaultFlow="signUp" />
            </div>

            <div className="text-center mt-6">
              <p className="text-slate-600">
                Already have an account?{" "}
                <button
                  onClick={onSignInLink}
                  className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
