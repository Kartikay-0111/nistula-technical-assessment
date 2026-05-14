// src/services/confidence.js
// Contains the logic to compute a confidence score for the drafted reply and determine the appropriate action (auto-send, agent review, or escalate).

// relying on the LLM’s self-confidence seemed simple, but LLMs are often overconfident even when hallucinating
// My logic is primarily intent-driven:

// availability, pricing, and check-in queries are usually factual and safe to auto-send,
// special requests and general enquiries lean toward agent review,
// complaints always escalate.

// Small heuristic penalties are then applied for things like hedge words (“maybe”, “let me check”), unsupported promises, escalation language, missing booking context, and overly complex messages.

// to be honest i am not sure about how effective this logic would be but it is a good starting point and we can keep improving it based on the real world performance and feedback from the team.
// with more time i would look into some tutorials and examples of confidence scoring in AI systems to see if there are any established best practices or techniques that I can apply here
const HEDGE_WORDS = [
  "maybe",
  "perhaps",
  "not sure",
  "i think",
  "might",
  "possibly",
  "let me check",
  "should be",
];

const ESCALATION_WORDS = [
  "manager",
  "refund",
  "legal",
  "terrible",
  "worst",
  "angry",
  "unsafe",
];

const UNSUPPORTED_PROMISES = [
  "guaranteed early check-in",
  "free upgrade",
  "free breakfast",
  "airport pickup included",
  "discount",
];

function containsAny(text, words) {
  const lower = text.toLowerCase();
  return words.some(word => lower.includes(word));
}

function computeConfidence(normalizedMessage, draftedReply) {
  const {
    query_type,
    booking_ref,
    message_text = "",
  } = normalizedMessage;

  const reply = (draftedReply || "").toLowerCase();

  // Base score by query type
  const BASE_SCORES = {
    pre_sales_availability: 0.92,
    pre_sales_pricing: 0.92,
    post_sales_checkin: 0.90,

    special_request: 0.72,
    general_enquiry: 0.68,

    complaint: 0.40,
  };

  let score = BASE_SCORES[query_type] || 0.60;

  // Complaints always escalate
  if (query_type === "complaint") {
    return 0.40;
  }

  // Hedge / uncertainty detection
  if (containsAny(reply, HEDGE_WORDS)) {
    score -= 0.12;
  }

  // Escalation language
  if (
    containsAny(message_text, ESCALATION_WORDS) ||
    containsAny(reply, ESCALATION_WORDS)
  ) {
    score -= 0.25;
  }

  // Unsupported promises
  if (containsAny(reply, UNSUPPORTED_PROMISES)) {
    score -= 0.30;
  }

  // Check-in security
  if (
    query_type === "post_sales_checkin" &&
    !booking_ref &&
    (
      reply.includes("wifi") ||
      reply.includes("password")
    )
  ) {
    score -= 0.50;
  }

  // Message complexity
  if (message_text.length > 250) {
    score -= 0.10;
  }

  // Special request cap
  if (query_type === "special_request") {
    score = Math.min(score, 0.84);
  }

  // General enquiry cap
  if (query_type === "general_enquiry") {
    score = Math.min(score, 0.84);
  }

  score = Math.max(0, Math.min(1, score));

  return Number(score.toFixed(2));
}

function determineAction(confidence, queryType) {
  if (queryType === "complaint") {
    return "escalate";
  }

  if (confidence >= 0.85) {
    return "auto_send";
  }

  if (confidence >= 0.60) {
    return "agent_review";
  }

  return "escalate";
}

module.exports = {
  computeConfidence,
  determineAction,
};