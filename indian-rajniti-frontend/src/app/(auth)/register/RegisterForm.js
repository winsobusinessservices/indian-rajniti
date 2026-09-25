"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthPasswordField from "@/components/auth/AuthPasswordField";
import { authApi, policiesApi } from "@/lib/api";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("details");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [verificationToken, setVerificationToken] = useState("");

  const [registrationPolicies, setRegistrationPolicies] = useState([]);

  useEffect(() => {
    policiesApi.listForRegistration()
      .then((data) => setRegistrationPolicies(data.policies || []))
      .catch(() => setRegistrationPolicies([]));
  }, []);

  const consentPolicies = registrationPolicies.length > 0
    ? registrationPolicies.map((policy) => ({ id: policy.id, title: policy.title, href: `/policies/${policy.slug}` }))
    : [
        { id: "terms", title: "Terms of Service", href: "/policies/terms-of-service" },
        { id: "privacy", title: "Privacy Policy", href: "/policies/privacy-policy" },
      ];
  const currentStep = step === "details" ? 1 : step === "otp" ? 2 : 3;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (step === "details" && !agreedToTerms) {
      setError("Please agree to the required policies.");
      return;
    }
    if (step === "details" && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (step === "details" && !STRONG_PASSWORD_REGEX.test(form.password)) {
      setError("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
      return;
    }

    setLoading(true);


    try {
      if (step === "details") {
        const data = await authApi.requestRegistrationOtp({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          agreeToTerms: agreedToTerms,
          acceptedPolicyIds: registrationPolicies.map((policy) => policy.id),
        });
        setChallengeToken(data.challengeToken);
        setEmailOtp("");
        setMobileOtp("");
        setStep("otp");
        setSuccess(`Verification codes were sent for ${form.email.trim()} and ${form.phone.trim()}.`);
        return;
      }

      if (step === "otp") {
        const verified = await authApi.verifyRegistrationOtp({
          email: form.email.trim(),
          phone: form.phone.trim(),
          emailOtp,
          mobileOtp,
          challengeToken,
        });
        setVerificationToken(verified.verificationToken);
        setStep("verified");
        setSuccess("Email and mobile number verified. You can now create your account.");
        return;
      }

      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        agreeToTerms: agreedToTerms,
        acceptedPolicyIds: registrationPolicies.map((policy) => policy.id),
        verificationToken,
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
      const data = await authApi.requestRegistrationOtp({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        agreeToTerms: agreedToTerms,
        acceptedPolicyIds: registrationPolicies.map((policy) => policy.id),
      });
      setChallengeToken(data.challengeToken);
      setEmailOtp("");
      setMobileOtp("");
      setVerificationToken("");
      setStep("otp");
      setSuccess("New email and mobile verification codes were sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeDetails = () => {
    setStep("details");
    setEmailOtp("");
    setMobileOtp("");
    setChallengeToken("");
    setVerificationToken("");
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
      <form onSubmit={handleSubmit} inert={loading} aria-busy={loading} className="mt-8 space-y-6">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant" aria-label={`Registration step ${currentStep} of 3`}>
          <span className="text-primary">Step {currentStep} of 3</span>
          <span className="h-px flex-1 bg-outline-variant/40" />
          <span>{step === "details" ? "Account details" : step === "otp" ? "Verify contacts" : "Finish"}</span>
        </div>

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
            id="mobile-number"
            name="phone"
            label="Mobile Number"
            type="tel"
            icon="fa-solid fa-mobile-screen-button"
            autoComplete="tel"
            required
            value={form.phone}
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
          <p className="text-xs leading-5 text-on-surface-variant">We will send one verification code to your email and another to your mobile number.</p>
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
        ) : step === "otp" ? (
          <div>
            <h2 className="font-headline-md text-xl text-on-surface">Verify your contact details</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Enter the two six-digit codes we sent.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label htmlFor="email-registration-otp" className="block text-sm font-semibold text-on-surface">Email OTP<span className="mt-1 block truncate text-xs font-normal text-on-surface-variant">{form.email}</span>
                <input id="email-registration-otp" name="emailOtp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={emailOtp} onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-md border border-outline-variant/60 bg-surface px-3 py-3 text-center font-headline-lg text-xl tracking-[0.3em] text-on-surface outline-none focus:border-primary" placeholder="000000" />
              </label>
              <label htmlFor="mobile-registration-otp" className="block text-sm font-semibold text-on-surface">Mobile OTP<span className="mt-1 block truncate text-xs font-normal text-on-surface-variant">{form.phone}</span>
                <input id="mobile-registration-otp" name="mobileOtp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={mobileOtp} onChange={(event) => setMobileOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-md border border-outline-variant/60 bg-surface px-3 py-3 text-center font-headline-lg text-xl tracking-[0.3em] text-on-surface outline-none focus:border-primary" placeholder="000000" />
              </label>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">The mobile code is sent by SMS and may take a few moments to arrive.</p>
            <div className="mt-5 flex items-center justify-between text-xs font-label-md">
              <button type="button" onClick={resendOtp} disabled={loading} className="text-primary hover:underline disabled:opacity-50">
                Resend both codes
              </button>
              <button type="button" onClick={changeDetails} disabled={loading} className="font-label-md font-semibold text-primary hover:underline disabled:opacity-50">
                Change details
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary"><i className="fa-solid fa-check" aria-hidden="true" /></span>
            <h2 className="mt-4 font-headline-md text-lg text-on-surface">Verification complete</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Your email <strong>{form.email}</strong> and mobile number <strong>{form.phone}</strong> are verified.</p>
            <button type="button" onClick={changeDetails} disabled={loading} className="mt-4 text-xs font-semibold text-primary hover:underline disabled:opacity-50">Change registration details</button>
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
              {consentPolicies.map((policy, index) => (
                <span key={policy.id}>
                  {index > 0 && (index === consentPolicies.length - 1 ? " and " : ", ")}
                  <Link className="text-primary hover:underline font-label-md" href={policy.href} target="_blank" rel="noopener noreferrer">
                    {policy.title}
                  </Link>
                </span>
              ))}
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
                ? step === "details" ? "Sending Codes..." : step === "otp" ? "Verifying Codes..." : "Creating Account..."
                : step === "details" ? "Send Verification Codes" : step === "otp" ? "Verify Both Codes" : "Create Account"}
              <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
