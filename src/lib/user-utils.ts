import type { Doc } from "../../convex/_generated/dataModel";

type UserLike = Pick<Doc<"users">, "name" | "email" | "isAnonymous"> | null | undefined;

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

export function getUserInitials(user: UserLike): string {
  if (!user) {
    return "??";
  }

  const name = user.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).slice(0, 2);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase() || "?";
    }
    return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "??";
  }

  const email = user.email?.trim();
  if (email) {
    const [localPart] = email.split("@");
    if (!localPart) {
      return "??";
    }
    if (localPart.length === 1) {
      return localPart.toUpperCase();
    }
    return `${localPart[0]}${localPart[1]}`.toUpperCase();
  }

  return "??";
}

export function getUserEmail(user: UserLike): string | null {
  return user?.email ?? null;
}

export function isAnonymousUser(user: UserLike): boolean {
  return Boolean(user?.isAnonymous && !user?.email && !user?.name);
}
