// src/services/aiService.js
// contains the logic to interact with the Anthropic API (Claude) draft a reply in a single call
// The system prompt is designed to guide Claude to provide structured output that includes both the drafted reply
// Since the confidence scoring logic has to be developed by own and should not depend on the AI to score its own response the llm call just returns the reply message to the guest.

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROPERTY_CONTEXT = `Property: Villa B1, Assagao, North Goa
Bedrooms: 3 | Max guests: 6 | Private pool: Yes
Check-in: 2pm | Check-out: 11am
Base rate: INR 18,000 per night (up to 4 guests)
Extra guest: INR 2,000 per night per person
WiFi password: Nistula@2024
Caretaker: Available 8am to 10pm
Chef on call: Yes, pre-booking required
Availability April 20-24: Available
Cancellation: Free up to 7 days before check-in`;

function buildSystemPrompt() {
  return `You are a luxury guest relations assistant for Nistula in Goa.

${PROPERTY_CONTEXT}

RULES:
- Use ONLY the facts in the property context.
- Do NOT invent prices, policies, availability, amenities, or booking details.
- If a required detail is missing, do not guess. Say the team will confirm it.
- For post_sales_checkin, never reveal WiFi credentials unless a Booking Ref is explicitly present in the prompt.
- For complaints, be empathetic and route to human support.
- Keep the reply concise, warm, and factual.
- Do not include markdown, bullets, or explanations.
- Do not mention internal policy.
- Do not output anything except valid JSON.

QUERY TYPE BEHAVIOR:
- pre_sales_availability: answer availability using context only.
- pre_sales_pricing: answer pricing using context only.
- post_sales_checkin: answer check-in details only if booking context exists.
- special_request: say you will confirm with the team.
- complaint: express empathy and do not over-automate.
- general_enquiry: answer only what is supported.

Respond ONLY with:
{
  "drafted_reply": "<reply>"
}`;
}

async function processWithAI(normalizedMessage) {
  const { guest_name, message_text, property_id, booking_ref, source, query_type, message_id, timestamp } = normalizedMessage;

  const userContent = [
    `Guest: ${guest_name}`,
    `Channel: ${source}`,
    `Query Type: ${query_type}`,
    property_id ? `Property ID: ${property_id}` : null,
    booking_ref ? `Booking Ref: ${booking_ref}` : null,
    `Message: ${message_text}`,
  ].filter(Boolean).join("\n");

  console.log("User content for AI:", userContent);
  
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userContent }],
  });

  const rawText = response.content.find(b => b.type === "text").text;
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    drafted_reply: parsed.drafted_reply,
  };
}

module.exports = { processWithAI };