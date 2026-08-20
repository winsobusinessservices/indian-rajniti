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

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);


    try {
      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        agreeToTerms: agreedToTerms,

      });
      setSuccess("Account created successfully. Redirecting to sign in...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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

        <div className="flex items-center">
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
              <a className="text-primary hover:underline font-label-md" href="#">
                Terms of Service
              </a>{" "}
              and{" "}
              <a className="text-primary hover:underline font-label-md" href="#">
                Privacy Policy
              </a>
              .
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center bg-primary py-3 px-4 font-label-md text-on-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 uppercase tracking-widest overflow-hidden disabled:opacity-60"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 opacity-30 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" />
            <span className="relative flex items-center gap-2">
              {loading ? "Creating Account..." : "Create Account"}
              <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
