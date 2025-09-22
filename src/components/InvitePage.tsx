import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "../SignInForm";

export function InvitePage({
  token,
  onComplete,
}: {
  token: string;
  onComplete: () => void;
}) {
  const invitation = useQuery(api.invitations.infoForToken, { token });
  const acceptInvite = useMutation(api.invitations.accept);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [isAccepting, setIsAccepting] = useState(false);

  if (invitation === undefined) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!invitation) {
    return (
      <PageContainer>
        <InviteCard title="Invitation not found" description="This invite link is invalid or has been removed." onComplete={onComplete} />
      </PageContainer>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <PageContainer>
        <InviteCard
          title="Invite unavailable"
          description={statusMessage(invitation.status)}
          onComplete={onComplete}
        />
      </PageContainer>
    );
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptInvite({ token });
      toast.success("Invitation accepted. Redirecting to your workspace.");
      onComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not accept invitation.";
      toast.error(message);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-md w-full space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-primary">Join {invitation.organizationName}</h1>
          <p className="text-secondary text-sm">
            You were invited as a <span className="font-medium">{invitation.role}</span> using {invitation.email}.
          </p>
        </header>
        <Unauthenticated>
          <div className="space-y-4">
            <p className="text-sm text-secondary text-center">
              Sign in or create an account to accept this invitation.
            </p>
            <SignInForm />
          </div>
        </Unauthenticated>
        <Authenticated>
          <div className="flex flex-col gap-4">
            {loggedInUser?.email && loggedInUser.email !== invitation.email ? (
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                This invite is for {invitation.email}, but you are signed in as {loggedInUser.email}.
                You can continue, or sign out and switch accounts.
              </p>
            ) : (
              <p className="text-sm text-secondary text-center">
                Accept to join {invitation.organizationName} as a {invitation.role}.
              </p>
            )}
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="auth-button disabled:opacity-70"
            >
              {isAccepting ? "Accepting..." : "Accept invitation"}
            </button>
            <button
              onClick={onComplete}
              className="text-sm text-secondary hover:text-primary hover:underline"
            >
              Return to dashboard
            </button>
          </div>
        </Authenticated>
      </div>
    </PageContainer>
  );
}

function statusMessage(status: string) {
  switch (status) {
    case "accepted":
      return "This invitation has already been accepted.";
    case "expired":
      return "This invitation has expired. Ask the sender for a new link.";
    case "revoked":
      return "This invitation was revoked. Contact the workspace owner for help.";
    default:
      return "This invitation is no longer available.";
  }
}

function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-gradient p-6">
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}

function InviteCard({
  title,
  description,
  onComplete,
}: {
  title: string;
  description: string;
  onComplete: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-8 shadow-sm space-y-4">
      <h2 className="text-2xl font-semibold text-primary">{title}</h2>
      <p className="text-secondary text-sm">{description}</p>
      <button
        onClick={onComplete}
        className="auth-button"
      >
        Go to app
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
