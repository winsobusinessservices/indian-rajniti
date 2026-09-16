"use client";

import { useEffect, useState } from "react";
import { walletApi } from "@/lib/api";
import { DashboardRowsSkeleton } from "@/components/common/PageSkeletons";

const EMPTY_SUMMARY = {
  availablePoints: 0,
  availableValueInr: 0,
  pendingWithdrawalPoints: 0,
  pendingWithdrawalValueInr: 0,
  lifetimeEarnedPoints: 0,
  lifetimeEarnedValueInr: 0,
  lifetimeWithdrawnPoints: 0,
  lifetimeWithdrawnValueInr: 0,
};

const SUMMARY_CARDS = [
  { key: "availablePoints", label: "Available points", icon: "fa-coins", accent: "text-primary bg-primary/10" },
  { key: "availableValueInr", label: "Available value", icon: "fa-indian-rupee-sign", accent: "text-emerald-700 bg-emerald-100", currency: true },
  { key: "lifetimeEarnedPoints", label: "Total earned points", icon: "fa-arrow-trend-up", accent: "text-green-700 bg-green-100" },
  { key: "lifetimeEarnedValueInr", label: "Total earned value", icon: "fa-sack-dollar", accent: "text-teal-700 bg-teal-100", currency: true },
  { key: "pendingWithdrawalPoints", label: "Pending withdrawal points", icon: "fa-clock", accent: "text-amber-700 bg-amber-100" },
  { key: "lifetimeWithdrawnPoints", label: "Total withdrawn points", icon: "fa-money-bill-transfer", accent: "text-blue-700 bg-blue-100" },
];

function formatCategory(category) {
  return String(category || "POINTS").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
}

export default function WalletClient() {
  const [wallet, setWallet] = useState({ summary: EMPTY_SUMMARY, transactions: [], withdrawals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalPoints, setWithdrawalPoints] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [generatingWithdrawalId, setGeneratingWithdrawalId] = useState(null);

  useEffect(() => {
    walletApi
      .getWallet()
      .then((data) => {
        setWallet(data.wallet);
        setWithdrawalPoints(String(data.wallet.withdrawalEligibility?.maximumWithdrawablePoints || ""));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const submitWithdrawal = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWithdrawing(true);
    try {
      const data = await walletApi.requestWithdrawal(Number(withdrawalPoints));
      setWallet(data.wallet);
      setSuccess(data.message);
      setShowWithdrawalForm(false);
      if (data.payoutUrl) window.location.assign(data.payoutUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const generatePayoutLink = async (withdrawalId) => {
    setError("");
    setSuccess("");
    setGeneratingWithdrawalId(withdrawalId);
    try {
      const data = await walletApi.generatePayoutLink(withdrawalId);
      setWallet(data.wallet);
      setSuccess(data.message);
      if (data.payoutUrl) window.location.assign(data.payoutUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingWithdrawalId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-full px-4 py-10 md:px-16">
        <h1 className="mb-6 font-display-lg text-3xl text-primary">Wallet</h1>
        <DashboardRowsSkeleton />
      </div>
    );
  }

  const eligibility = wallet.withdrawalEligibility;
  const rupeesPerPoint = wallet.pointRate?.rupeesPerPoint || 1;
  const requestedValueInr = (Number(withdrawalPoints) || 0) * rupeesPerPoint;

  return (
    <div className="mx-auto max-w-full px-4 py-10 md:px-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 font-label-md text-xs uppercase tracking-[0.16em] text-on-surface-variant">Contributor rewards</p>
          <h1 className="font-display-lg text-3xl text-primary">Wallet</h1>
          <p className="mt-2 max-w-2xl font-body-md text-sm text-on-surface-variant">View your point balance, withdrawals, and wallet activity.</p>
          <p className="mt-1 font-label-md text-xs font-semibold text-primary">Your rate: 1 point = {formatInr(rupeesPerPoint)}</p>
        </div>
        <button
          type="button"
          disabled={!eligibility?.canWithdraw}
          title={eligibility?.blockedReason || "Request a points withdrawal"}
          onClick={() => setShowWithdrawalForm(true)}
          className={`min-h-11 rounded-lg px-5 font-label-md text-sm font-semibold transition-colors ${eligibility?.canWithdraw
            ? "bg-primary text-on-primary hover:bg-primary-container"
            : "cursor-not-allowed bg-outline-variant/35 text-on-surface-variant opacity-70"
          }`}
        >
          <i className="fa-solid fa-building-columns mr-2" aria-hidden="true" />
          Withdraw points
        </button>
      </div>

      {error && <p className="mb-5 rounded-lg border border-error/25 bg-error/5 p-4 font-body-md text-sm text-error" role="alert">{error}</p>}
      {success && <p className="mb-5 rounded-lg border border-green-600/25 bg-green-50 p-4 font-body-md text-sm text-green-700" role="status">{success}</p>}

      {eligibility && (
        <>
          <section className={`mb-6 rounded-xl border p-5 ${eligibility.canWithdraw ? "border-green-600/25 bg-green-50" : "border-outline-variant/25 bg-surface-container-low"}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${eligibility.canWithdraw ? "bg-green-100 text-green-700" : "bg-surface-container-high text-on-surface-variant"}`}>
                <i className={`fa-solid ${eligibility.canWithdraw ? "fa-circle-check" : "fa-lock"}`} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-label-md text-sm font-semibold text-on-surface">
                  {eligibility.canWithdraw ? "Withdrawal is available" : "Withdrawal is currently unavailable"}
                </h2>
                <p className="mt-1 font-body-md text-xs text-on-surface-variant">{eligibility.blockedReason || "You can submit one withdrawal request for this month."}</p>
                <p className="mt-2 font-body-md text-xs text-on-surface-variant">
                  Rules: At least {formatInr(eligibility.minimumWithdrawalInr)} required to qualify · Keep {formatInr(eligibility.minimumRemainingInr)} in the wallet · One request per month · Any calendar date
                </p>
                {eligibility.alreadyRequested && eligibility.nextWithdrawalDate && (
                  <p className="mt-1 font-label-md text-xs font-semibold text-primary">Next eligible month begins: {eligibility.nextWithdrawalDate}</p>
                )}
              </div>
            </div>
          </section>

          {showWithdrawalForm && eligibility.canWithdraw && (
            <form onSubmit={submitWithdrawal} className="mb-8 rounded-xl border border-primary/25 bg-surface-container p-5">
              <h2 className="font-display-lg text-xl text-primary">Instant withdrawal</h2>
              <p className="mt-1 font-body-md text-xs text-on-surface-variant">You will continue to RazorpayX to choose a bank account or UPI ID.</p>
              <label className="mt-4 block max-w-sm">
                <span className="mb-1 block font-label-md text-xs text-on-surface-variant">Points to withdraw</span>
                <input
                  type="number"
                  min="1"
                  max={eligibility.maximumWithdrawablePoints}
                  step="1"
                  required
                  value={withdrawalPoints}
                  onChange={(event) => setWithdrawalPoints(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 font-body-md text-on-surface outline-none focus:border-primary"
                />
                <span className="mt-2 block font-label-md text-xs font-semibold text-primary">Estimated payout: {formatInr(requestedValueInr)} · {formatInr(eligibility.minimumRemainingInr)} will remain protected</span>
              </label>
              <div className="mt-4 flex flex-wrap gap-3">
                <button disabled={withdrawing} className="min-h-11 rounded-lg bg-primary px-5 font-label-md text-sm font-semibold text-on-primary disabled:opacity-60">
                  {withdrawing ? "Creating secure link..." : "Continue to RazorpayX"}
                </button>
                <button type="button" onClick={() => setShowWithdrawalForm(false)} className="min-h-11 rounded-lg border border-outline-variant/40 px-5 font-label-md text-sm text-on-surface">Cancel</button>
              </div>
            </form>
          )}
        </>
      )}

      <section aria-label="Wallet summary" className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.key} className="rounded-xl flex flex-col md:flex-row md:justify-between md:items-center border border-outline-variant/20 bg-surface-container p-5">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full">
              <i className={`fa-solid ${card.icon} ${card.accent} p-3 rounded-xl`} aria-hidden="true" />
            </span>
            <div className="flex flex-col md:items-center gap-2">
              <p className="font-body-lg text-3xl font-bold tabular-nums text-on-surface">
                {card.currency
                  ? formatInr(wallet.summary?.[card.key])
                  : (wallet.summary?.[card.key] || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 font-label-md text-xs text-on-surface-variant">{card.label}</p>
            </div>
          </div>
        ))}
      </section>

      {wallet.withdrawals?.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display-lg text-2xl text-primary">Withdrawal requests</h2>
          <div className="space-y-3">
            {wallet.withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/20 bg-surface-container p-4">
                <div>
                  <p className="font-label-md text-sm font-semibold text-on-surface">{withdrawal.points.toLocaleString("en-IN")} points · {formatInr(withdrawal.amountInr)}</p>
                  <p className="mt-1 font-body-md text-xs text-on-surface-variant">Requested {formatDate(withdrawal.requestedAt)}</p>
                  {withdrawal.providerFailureReason && <p className="mt-1 font-body-md text-xs text-error">{withdrawal.providerFailureReason}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-label-md text-[10px] font-bold uppercase text-amber-700">{withdrawal.status}</span>
                  {withdrawal.payoutLinkUrl && ["PENDING", "PROCESSING"].includes(withdrawal.status) && (
                    <a href={withdrawal.payoutLinkUrl} className="font-label-md text-xs font-semibold text-primary underline underline-offset-2">Complete payout</a>
                  )}
                  {!withdrawal.payoutLinkUrl
                    && withdrawal.status === "PENDING"
                    && withdrawal.providerStatus !== "creation_uncertain" && (
                    <button
                      type="button"
                      disabled={generatingWithdrawalId === withdrawal.id}
                      onClick={() => generatePayoutLink(withdrawal.id)}
                      className="min-h-9 rounded-lg bg-primary px-3 font-label-md text-xs font-semibold text-on-primary disabled:opacity-60"
                    >
                      {generatingWithdrawalId === withdrawal.id ? "Generating..." : "Generate secure payout link"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4">
          <h2 className="font-display-lg text-2xl text-primary">Points history</h2>
          <p className="mt-1 font-body-md text-xs text-on-surface-variant">Your 100 most recent wallet transactions</p>
        </div>
        {wallet.transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low px-5 py-12 text-center">
            <i className="fa-solid fa-receipt mb-3 text-3xl text-outline" aria-hidden="true" />
            <p className="font-label-md text-sm font-semibold text-on-surface">No points activity yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container">
            <ul className="divide-y divide-outline-variant/20">
              {wallet.transactions.map((transaction) => {
                const credit = transaction.direction === "CREDIT";
                return (
                  <li key={transaction.id} className="flex items-center gap-4 p-4 sm:p-5">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${credit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      <i className={`fa-solid ${credit ? "fa-arrow-down" : "fa-arrow-up"}`} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-label-md text-sm font-semibold text-on-surface">{transaction.description}</p>
                      <p className="mt-1 font-body-md text-xs text-on-surface-variant">{formatCategory(transaction.category)} · {formatDate(transaction.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-body-md text-base font-bold tabular-nums ${credit ? "text-green-700" : "text-red-700"}`}>{credit ? "+" : "-"}{transaction.points.toLocaleString("en-IN")}</p>
                      <p className="font-label-md text-[10px] text-on-surface-variant">Balance {transaction.balanceAfter.toLocaleString("en-IN")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
