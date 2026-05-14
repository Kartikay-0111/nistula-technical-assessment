// src/routes/webhook.js
// This files combines all the actions
//   1. Validate input
//   2. Normalize to unified schema
//   3. Assign query to the request
//   3. Classify + draft reply via Claude
//   4. Compute confidence score
//   5. Determine action and return response

const express = require("express");
const router = express.Router();

const { validateWebhookPayload } = require("../middleware/validator");
const { normalizeMessage } = require("../services/normalizer");
const { assignQueryType } = require("../services/queryTypeAssigner"); 
const { processWithAI } = require("../services/aiService");
const { computeConfidence, determineAction } = require("../services/confidence");

router.post("/message", validateWebhookPayload, async (req, res) => {
  const startTime = Date.now();

  try {
    // Normalize 
    const normalized = normalizeMessage(req.body);

    // Assign query type
    const queryType = await assignQueryType(normalized);
    normalized.query_type = queryType.query_type;

    // reply drafting 
    const aiResult = await processWithAI(normalized);

    // Compute confidence score for the drafted reply
    const confidence = computeConfidence(normalized, aiResult.drafted_reply);

    // Determine action based on confidence and query type
    const action = determineAction(confidence, normalized.query_type);

    // Build and return response
    const response = {
      message_id: normalized.message_id,
      query_type: normalized.query_type,
      drafted_reply: aiResult.drafted_reply,
      confidence_score: confidence,
      action : action,
    };

    return res.status(200).json(response);

  } 
  catch (err) {
    console.error(`[POST /webhook/message] Error after ${Date.now() - startTime}ms:`, err.message);

    // Anthropic SDK error statuses to meaningful responses
    if (err.status === 401) {
      return res.status(500).json({
        error: "AI service authentication failed",
        hint: "Check that ANTHROPIC_API_KEY is set correctly in your .env file",
      });
    }

    if (err.status === 429) {
      return res.status(429).json({
        error: "AI service rate limit reached",
        hint: "Please wait a moment and try again",
      });
    }

    if (err.status === 529 || err.message?.toLowerCase().includes("overloaded")) {
      return res.status(503).json({
        error: "AI service is temporarily overloaded",
        hint: "Retry in a few seconds",
      });
    }

    if (err.message?.includes("non-JSON response")) {
      return res.status(502).json({
        error: "Unexpected response from AI service",
        hint: "The AI returned a malformed reply - please try again",
      });
    }

    return res.status(500).json({
      error: "An unexpected error occurred",
      hint: "Please try again or contact support if the issue persists",
    });
  }
});

module.exports = router;