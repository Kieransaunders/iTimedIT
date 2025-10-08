import { toast } from "sonner";

type NotifyOptions = {
  fallbackMessage?: string;
  unauthorizedMessage?: string;
};

export function notifyMutationError(
  error: unknown,
  { fallbackMessage, unauthorizedMessage }: NotifyOptions = {}
): void {
  const fallback = fallbackMessage ?? "Something went wrong. Please try again.";
  const unauthorized =
    unauthorizedMessage ?? "You don’t have permission to perform this action.";

  let message = fallback;

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes("insufficient permissions")) {
      message = unauthorized;
    } else if (normalized.includes("not authenticated")) {
      message = "Your session expired. Please sign in again.";
    } else if (error.message.trim().length > 0) {
      message = error.message;
    }
  } else if (typeof error === "string" && error.trim().length > 0) {
    message = error;
  }

  toast.error(message);

  if (error) {
    console.error(error);
  }
}
