// src/services/normalizer.js
// Converts the raw incoming payload from various sources into the unified message schema.
// query_type is left null here.It is assign later with the help of query_type assigner

// {
//    "message_id": "generated UUID",
//    "source": "whatsapp",
//    "guest_name": "Rahul Sharma",
//    "message_text": "Is the villa available...",
//    "timestamp": "2026-05-05T10:30:00Z",
//    "booking_ref": "NIS-2024-0891",
//    "property_id": "villa-b1",
//    "query_type": "pre_sales_availability"
// }

const { v4: uuidv4 } = require("uuid");

// This is to check the payload for the initial correctness 
const VALID_SOURCES = [
  "whatsapp",
  "booking_com",
  "airbnb",
  "instagram",
  "direct",
];

/**
 * Normalizes the webhook payload into the unified guest message schema.
 *
 * @param {Object} payload - Raw request body from the webhook
 * @returns {Object} Normalized message object
 */


function normalizeMessage(payload) {
  const { source, guest_name, message, timestamp, booking_ref, property_id } = payload;

  const normalizedTimestamp = timestamp
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();

  return {
    message_id: uuidv4(),
    source: source.toLowerCase().trim(),
    guest_name: guest_name.trim(),
    message_text: message.trim(),
    timestamp: normalizedTimestamp,
    booking_ref: booking_ref?.trim() || null, // the thinking for this is mentioned in the validator
    property_id: property_id?.trim() || null,
    query_type: null,
    // How to assign query type? It can be done by the AI call itself easily.
    // But as per my thinking,in the menioned assignment query type needs to be assigned in the schema before passing it to the AI. 
    // It can be done by checking for some keywords like cost,available,refund,book etc. but I dont think so that would be 100% accurate.
    // We can try assigning query_type based on regex patterns.If it fails to assign then we will keep it null and let the AI handle it. 
  };
}

module.exports = { normalizeMessage, VALID_SOURCES };