import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import type { AppPage } from "./ProfilePage";

export function TestEmailPage({ onNavigate }: { onNavigate?: (page: AppPage) => void }) {
  const [recipient, setRecipient] = useState("delivered@resend.dev");
  const [isSending, setIsSending] = useState(false);
  const [lastSentTo, setLastSentTo] = useState<string | null>(null);
  const requestTestEmail = useMutation(api.sendEmails.requestTestEmail);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) {
      toast.error("Enter a recipient email address");
      return;
    }

    try {
      setIsSending(true);
      await requestTestEmail({ to: trimmedRecipient });
      setLastSentTo(trimmedRecipient);
      toast.success("Test email scheduled", {
        description: `Resend will deliver to ${trimmedRecipient}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to schedule email", { description: message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => onNavigate?.("settings")}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        ← Back to settings
      </button>

      <section className="rounded-xl border border-gray-200 p-6 space-y-6 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Resend test email</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Send a one-off message through Resend to confirm production credentials. Use the default Resend test inbox or
            target a teammate's email address.
          </p>
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-100">
            Emails send using the address configured in <code className="rounded bg-amber-100 px-1 py-0.5 text-xs font-medium dark:bg-amber-500/30">RESEND_FROM_EMAIL</code> on production.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Recipient email</span>
            <input
              type="email"
              required
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="delivered@resend.dev"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200">What happens next?</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Convex queues the email instantly.</li>
                <li>Resend delivers using your production domain.</li>
                <li>Check Resend logs if the inbox doesn't receive it.</li>
              </ul>
            </div>
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {isSending ? "Sending..." : "Send test email"}
            </button>
          </div>
        </form>

        {lastSentTo ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-600/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            Last email requested for <span className="font-semibold">{lastSentTo}</span>. Check your Resend dashboard for delivery status.
          </div>
        ) : null}
      </section>
    </div>
  );
}
