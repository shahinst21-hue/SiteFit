export type AuthFailure = "invalid-link" | "unavailable" | "sign-out-failed";
export const authMessages: Record<AuthFailure, string> = {
  "invalid-link":
    "This sign-in link has expired or is invalid. Request a new link below.",
  unavailable: "Sign-in is temporarily unavailable. Please try again later.",
  "sign-out-failed": "We could not sign you out. Please try again.",
};
export function authFailure(value: unknown): AuthFailure | null {
  return typeof value === "string" && Object.hasOwn(authMessages, value)
    ? (value as AuthFailure)
    : null;
}
export function emailInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}
// Only explicit local destinations; no open redirect or authentication loop.
export function authDestination(
  value: unknown,
): "/account" | "/check-location" {
  return value === "/check-location" ? value : "/account";
}
export function callbackCredentials(
  params: URLSearchParams,
): { kind: "code"; value: string } | { kind: "email"; value: string } | null {
  if (params.has("error") || params.has("error_code")) return null;
  const code = params.get("code");
  const token = params.get("token_hash");
  if (
    code &&
    !token &&
    params.getAll("code").length === 1 &&
    /^[A-Za-z0-9_-]{16,2048}$/.test(code)
  )
    return { kind: "code", value: code };
  if (
    token &&
    !code &&
    params.get("type") === "email" &&
    params.getAll("token_hash").length === 1 &&
    params.getAll("type").length === 1 &&
    /^[a-fA-F0-9]{32,256}$/.test(token)
  )
    return { kind: "email", value: token };
  return null;
}
export async function completeAuthCallback(
  credentials: NonNullable<ReturnType<typeof callbackCredentials>>,
  auth: {
    exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
    verifyOtp: (input: {
      token_hash: string;
      type: "email";
    }) => Promise<{ error: unknown }>;
  },
): Promise<boolean> {
  try {
    const result =
      credentials.kind === "code"
        ? await auth.exchangeCodeForSession(credentials.value)
        : await auth.verifyOtp({
            token_hash: credentials.value,
            type: "email",
          });
    return !result.error;
  } catch {
    return false;
  }
}
