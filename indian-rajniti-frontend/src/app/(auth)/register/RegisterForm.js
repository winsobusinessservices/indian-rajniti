"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthPasswordField from "@/components/auth/AuthPasswordField";
import { authApi } from "@/lib/api";

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("details");
  const [otp, setOtp] = useState("");
  const [challengeToken, setChallengeToken] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (step === "details" && !agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (step === "details" && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);


    try {
      if (step === "details") {
        const data = await authApi.requestRegistrationOtp(form.email.trim());
        setChallengeToken(data.challengeToken);
        setOtp("");
        setStep("otp");
        setSuccess(`A six-digit verification code was sent to ${form.email.trim()}.`);
        return;
      }

      const verified = await authApi.verifyRegistrationOtp({
        email: form.email.trim(),
        otp,
        challengeToken,
      });
      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        agreeToTerms: agreedToTerms,
        verificationToken: verified.verificationToken,
      });
      setSuccess("Account created successfully. Redirecting to sign in...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await authApi.requestRegistrationOtp(form.email.trim());
      setChallengeToken(data.challengeToken);
      setOtp("");
      setSuccess("A new verification code was sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setStep("details");
    setOtp("");
    setChallengeToken("");
    setError("");
    setSuccess("");
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Join the definitive chronicle of Indian political discourse."
      footer={
        <>
          <div>
            <span className="text-on-surface-variant font-body-md">
              Already have an account?
            </span>
            <Link
              href="/login"
              className="font-label-md text-primary hover:text-primary-container hover:underline ml-1 uppercase tracking-wide"
            >
              Sign in instead
            </Link>
          </div>
        </>
      }
    >
      <form onSubmit={handleSubmit} inert={loading ? "" : undefined} aria-busy={loading} className="mt-8 space-y-6">
        {step === "details" ? (
        <div className="space-y-5 rounded-md">
          <AuthTextField
            id="full-name"
            name="name"
            label="Full Name"
            icon="fa-solid fa-user"
            autoComplete="name"
            required
            value={form.name}
            onChange={handleChange}
          />
          <AuthTextField
            id="email-address"
            name="email"
            label="Email Address"
            type="email"
            icon="fa-solid fa-envelope"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
          />
          <AuthPasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={handleChange}
            showStrength
          />
          <div className="mt-4">
            <AuthPasswordField
              id="confirm-password"
              name="confirmPassword"
              label="Confirm Password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>
        ) : (
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-5 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-headline-md text-lg text-on-surface">Verify your email</h2>
            <p className="mt-1 font-body-md text-sm text-on-surface-variant">
              Enter the six-digit code sent to <strong className="text-on-surface">{form.email}</strong>.
            </p>
            <label htmlFor="registration-otp" className="sr-only">Verification code</label>
            <input
              id="registration-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-5 w-full rounded border border-outline-variant/40 bg-surface px-4 py-3 text-center font-headline-lg text-2xl tracking-[0.45em] text-on-surface outline-none focus:border-primary"
              placeholder="000000"
            />
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-label-md">
              <button type="button" onClick={resendOtp} disabled={loading} className="text-primary hover:underline disabled:opacity-50">
                Resend code
              </button>
              <button type="button" onClick={changeEmail} disabled={loading} className="text-on-surface-variant hover:text-primary hover:underline disabled:opacity-50">
                Change email
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-error font-body-md" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-primary font-body-md" role="status">
            {success}
          </p>
        )}

        {step === "details" && <div className="flex items-center">
          <div className="flex items-center h-5">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary bg-transparent accent-primary cursor-pointer"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="terms" className="font-label-sm text-on-surface-variant cursor-pointer">
              I agree to the{" "}
              <Link className="text-primary hover:underline font-label-md" href="/terms-of-service">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link className="text-primary hover:underline font-label-md" href="/privacy-policy">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
        </div>}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center bg-primary py-3 px-4 font-label-md text-on-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 uppercase tracking-widest overflow-hidden disabled:opacity-60"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 opacity-30 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" />
            <span className="relative flex items-center gap-2">
              {loading
                ? step === "details" ? "Sending Code..." : "Verifying..."
                : step === "details" ? "Send Verification Code" : "Verify & Create Account"}
              <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
