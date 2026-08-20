// A simple rule-based automated screen — no external AI service involved.
// Flags a small spam/profanity blocklist; the editor always makes the final
// call, this is advisory only and never blocks a submission.
const BLOCKLIST = ["buy now!!!", "click here to win", "viagra", "guaranteed income"];

function findBlockedPhrase(text) {
  const haystack = text.toLowerCase();
  return BLOCKLIST.find((term) => haystack.includes(term)) || null;
}

module.exports = { findBlockedPhrase };
