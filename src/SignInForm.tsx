"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
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
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">or</span>
        <hr className="my-4 grow border-gray-200" />
      </div>
      <button className="auth-button" onClick={() => void signIn("anonymous")}>
        Sign in anonymously
      </button>
    </div>
  );
}
