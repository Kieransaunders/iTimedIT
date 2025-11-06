import { User } from "@/types/models";

type UserLike = Pick<User, "name" | "email" | "isAnonymous"> | null | undefined;

/**
 * Get a display-friendly name for the user
 * Falls back to email, then "Anonymous" if no name available
 */
export function getUserDisplayName(user: UserLike): string {
  if (!user) {
    return "Anonymous";
  }

  const name = user.name?.trim();
  if (name) {
    return name;
  }

  const email = user.email?.trim();
  if (email) {
    return email;
  }

  return "Anonymous";
}

/**
 * Get user initials for avatar display
 * Returns up to 2 characters based on name or email
 */
export function getUserInitials(user: UserLike): string {
  if (!user) {
    return "??";
  }

  const name = user.name?.trim();
  if (name && name.length > 0) {
    try {
      const parts = name.split(/\s+/).slice(0, 2);
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase() || "?";
      }
      return parts.map((part: string) => part.charAt(0).toUpperCase()).join("") || "??";
    } catch (error) {
      // Fallback if split fails (Hermes bug workaround)
      return name.charAt(0).toUpperCase() || "?";
    }
  }

  const email = user.email?.trim();
  if (email && email.length > 0) {
    try {
      const atIndex = email.indexOf("@");
      const localPart = atIndex > 0 ? email.substring(0, atIndex) : email;

      if (!localPart || localPart.length === 0) {
        return "??";
      }
      if (localPart.length === 1) {
        return localPart.toUpperCase();
      }
      return `${localPart[0]}${localPart[1]}`.toUpperCase();
    } catch (error) {
      // Fallback if string operations fail
      return email.charAt(0).toUpperCase() || "??";
    }
  }

  return "??";
}

/**
 * Get user's email address
 */
export function getUserEmail(user: UserLike): string | null {
  return user?.email ?? null;
}

/**
 * Check if user is signed in anonymously (guest)
 */
export function isAnonymousUser(user: UserLike): boolean {
  return Boolean(user?.isAnonymous && !user?.email && !user?.name);
}
