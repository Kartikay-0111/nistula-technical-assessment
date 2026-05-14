// src/middleware/validator.js
// Express middleware that validates the incoming webhook payload before it reaches the route handler.

const { VALID_SOURCES } = require("../services/normalizer");

// {
//    "source": "whatsapp",
//    "guest_name": "Rahul Sharma",
//    "message": "Is the villa available from April 20 to 24? What is the rate for 2 adults?",
//    "timestamp": "2026-05-05T10:30:00Z",
//    "booking_ref": "NIS-2024-0891",
//    "property_id": "villa-b1"
// }

//  This payload contains a message asking for the villa availability.I think the booking_ref should have the booking id only when the villa is booked and the guest asks for some enquiry
//  Here given playload have a booking_ref but the user is asking for availabilty. 
//  Lets consider that when the user starts a thread the villa which he/she is contacting is assigned to the payload in property_id field.
//  Ideally it should be null if the message is from guest with no bookings, so we will handle that.
//  I am considering property_id can also be null sometimes in cases where any person just asks for the general query not associated to any particular villa.  

function validateWebhookPayload(req, res, next) {
  const { source, guest_name, message, timestamp } = req.body;
  const errors = [];

  if (!source) {
    errors.push("'source' is required");
  } else if (!VALID_SOURCES.includes(source.toLowerCase().trim())) {
    errors.push(
      `'source' must be one of: ${VALID_SOURCES.join(", ")}. Got: "${source}"`
    );
  }

  if (!guest_name || typeof guest_name !== "string" || !guest_name.trim()) {
    errors.push("'guest_name' is required and must be a non-empty string");
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    errors.push("'message' is required and must be a non-empty string");
  }

  if (timestamp && isNaN(Date.parse(timestamp))) {
    errors.push(
      `'timestamp' must be a valid ISO 8601 date string. Got: "${timestamp}"`
    );
  }

  if (req.body.booking_ref !== undefined && typeof req.body.booking_ref !== "string") {
    errors.push("'booking_ref' must be a string");
  }

  if (req.body.property_id !== undefined && typeof req.body.property_id !== "string") {
    errors.push("'property_id' must be a string");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
  }
  next();
}

module.exports = { validateWebhookPayload };