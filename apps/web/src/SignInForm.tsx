"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AuthFlow = "signIn" | "signUp";

export function SignInForm({ defaultFlow = "signIn" }: { defaultFlow?: AuthFlow }) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<AuthFlow>(defaultFlow);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFlow(defaultFlow);
  }, [defaultFlow]);

  return (
    <div className="w-full">
      <form
        className="flex flex-col space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting) {
            return;
          }
          setSubmitting(true);
          const formData = new FormData(event.target as HTMLFormElement);
          formData.set("flow", flow);

          try {
            await signIn("password", formData);
            toast.success(flow === "signIn" ? "Signed in successfully" : "Account created and signed in");
            
          } catch (error: any) {
            const message: string = error?.message ?? "";
            let toastTitle = "";
            if (message.includes("Invalid password") || message.includes("InvalidSecret")) {
              toastTitle = "Incorrect email or password.";
            } else if (message.includes("InvalidAccountId")) {
              toastTitle =
                flow === "signIn"
                  ? "No account found for that email. Try signing up."
                  : "Account already exists. Try signing in.";
            } else if (message.includes("TooManyFailedAttempts")) {
              toastTitle = "Too many attempts. Please wait a bit and try again.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Could not sign in. Please try again."
                  : "Could not sign up. Please try again.";
            }
            toast.error(toastTitle);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {flow === "signIn" ? "Signing in..." : "Creating account..."}
            </div>
          ) : (
            flow === "signIn" ? "Sign in" : "Create account"
          )}
        </button>
        
        <div className="text-center text-sm">
          <span className="text-slate-600">
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-orange-600 hover:text-orange-700 hover:underline font-medium cursor-pointer transition-colors"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>
      
      <div className="flex items-center my-6">
        <hr className="flex-1 border-slate-200" />
        <span className="mx-4 text-slate-400 text-sm font-medium">or</span>
        <hr className="flex-1 border-slate-200" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
          onClick={() => void signIn("google", { redirectTo: window.location.origin })}
        >
          Sign in with Google
        </button>
        <button
          type="button"
          className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          onClick={() => void signIn("anonymous")}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
