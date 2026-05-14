// src/services/queryTypeAssigner.js
// Assigns a query type to the normalized payload

// Since the assignment mentioned a complete unified schema should be developed before passing it to AI.
// I am using a heuristic based matching with the help of certain specific keywords in the message
// This is an architectural choice to achieve 0ms latency and $0 cost prior to the main AI call.
// Personally I think it is not 100% reliable but it ensures to handle majority of the cases.To ensure complete reliablity we can let the AI handle it and then process the request further 

const QUERY_PATTERNS = {
  pre_sales_availability: /\b(available|availability|dates|open|book|booking|vacant|free)\b/gi,
  pre_sales_pricing: /\b(rate|rates|cost|price|pricing|charge|discount|inr|rs|rupees|total)\b/gi,
  post_sales_checkin: /\b(check-in|check in|checkout|check-out|time|wifi|password|location|directions|address|key)\b/gi,
  special_request: /\b(early|late|airport|transfer|cab|taxi|surprise|anniversary|birthday|chef|cook|extra bed)\b/gi,
  complaint: /\b(not working|broken|dirty|unhappy|issue|problem|bad|terrible|ac|water|cleanliness|noise)\b/gi,
  general_enquiry: /\b(pets|parking|pool|smoking|rules|allowed|food|nearby|beach)\b/gi
};

const INTENT_PRIORITY = [
  "complaint", 
  "special_request", 
  "pre_sales_pricing", 
  "pre_sales_availability", 
  "post_sales_checkin", 
  "general_enquiry"
];

function assignQueryType(normalizedMessage) {
  const text = normalizedMessage.message_text;
  const scores = {};

// Iterate through all categories and score them based on keyword hits.
// This is safer than "first match wins" because a message might contain 
// keywords from multiple categories (e.g., "Is it available and what is the cost?")
// If there are multiple categories with the same score, we will use a predefined priority to assign the final query type.
  for (const [type, regex] of Object.entries(QUERY_PATTERNS)) {
    const matches = text.match(regex);
    scores[type] = matches ? matches.length : 0;
  }

  const maxScore = Math.max(...Object.values(scores));

  if (maxScore === 0) {
    return {
      ...normalizedMessage,
      query_type: "general_enquiry"
    };
  }

  const tiedIntents = Object.keys(scores).filter(type => scores[type] === maxScore);

  const finalType = tiedIntents.sort((a, b) => 
    INTENT_PRIORITY.indexOf(a) - INTENT_PRIORITY.indexOf(b)
  )[0];

  return {
    ...normalizedMessage,
    query_type: finalType
  };
}

module.exports = { assignQueryType };