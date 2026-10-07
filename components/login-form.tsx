"use client";
import { useRef, useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { PublicSupabaseConfig } from "@/lib/supabase/config";
import { emailInput } from "@/lib/auth/flow";
export function LoginForm({ config,google=false }: { config: PublicSupabaseConfig | null;google?:boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function googleSignIn(){
    if(!config||state==='sending')return;setState('sending');setError(null);
    try{
      const client=createBrowserSupabase(config);
      const {error:failure}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback`,queryParams:{prompt:'select_account'}}});
      if(failure)throw Error('unavailable');
    }catch{setError('Google sign-in is unavailable. Please try again.');setState('idle');}
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = emailInput(email);
    if (!checked) {
      setError("Enter a valid email address.");
      input.current?.focus();
      return;
    }
    if (!config || state === "sending") return;
    setError(null);
    setState("sending");
    try {
      const client = createBrowserSupabase(config);
      const { error: failure } = await client.auth.signInWithOtp({
        email: checked,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (failure) {
        setError(
          failure.status === 429
            ? "Please wait a minute before requesting another link."
            : "We could not send a sign-in link. Please try again later.",
        );
        setState("idle");
      } else setState("sent");
    } catch {
      setError(
        "We could not reach sign-in. Check your connection and try again.",
      );
      setState("idle");
    }
  }
  return (
    <section className="simple-panel" aria-label="Email sign-in">
      {google&&<button type="button" className="button button-secondary" disabled={!config||state==='sending'} onClick={googleSignIn}>Continue with Google</button>}
      {!config && (
        <p role="status">
          We could not connect to sign-in. Please try again later, or start a
          Free Snapshot without an account.
        </p>
      )}
      {state === "sent" ? (
        <div role="status">
          <h2>Check your inbox.</h2>
          <p>
            If email delivery is available for this address, a sign-in link is
            on its way. Open it in the same browser you used here. Links expire
            after one hour and work once.
          </p>
          <p className="field-help">
            Check your spam folder if needed. No password is required.
          </p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setState("idle")}
          >
            Use another email or request a new link
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={state === "sending"}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              ref={input}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!config || state === "sending"}
              aria-invalid={!!error}
              aria-describedby={error ? "email-error email-help" : "email-help"}
            />
            <p className="field-help" id="email-help">
              We'll send you a link to sign in or create your account. No
              password.
            </p>
          </div>
          {error && (
            <p id="email-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={!config || state === "sending"}
          >
            {state === "sending"
              ? "Sending your link…"
              : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </section>
  );
}
