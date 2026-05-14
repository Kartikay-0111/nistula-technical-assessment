### Question A — The Immediate Response

**The Message:**

> "Hey, I am really sorry. No hot water at 3am with guests coming for breakfast is genuinely stressful and I completely understand. I have notified this as urgent to the villa staff and someone will reach out to you within the next 30 minutes. We are on it."

**Why I chose this wording:**
A frustrated guest at 3am doesn't need to hear about refunds yet; they just need to know someone is actually listening and doing something about it. If the AI directly jumps to explaining the refund process, it can have a bad impact and make things worse. This message focuses on making them feel heard and letting them know help is coming. The refund conversation can wait until morning.

---

### Question B — The System Design

The moment that message comes in, the platform should:

* **Tag:** Automatically tag it as urgent based on keywords like "unacceptable" and "refund".
* **Notify:** Alert the on-duty villa staff via SMS and WhatsApp.
* **Log:** Record the complaint against Villa B1 with a timestamp and link it to the active reservation.
* **Track:** Start a 30-minute timer.

**After 30 minutes**
If nobody responds in 30 minutes, it escalates maybe a second person gets called, or the AI sends a follow-up to the guest saying, *"We're still working on this, here's a direct number you can contact."* The guest should never feel like their message went into a void.

---

### Question C — The Learning

This is actually the most interesting part to me. Three complaints about the same thing at the same property is not just a coincidence and it should be fixed.

**What I would build:**

* **Automated Pattern Flagging:** A flag that automatically surfaces when the same issue appears more than twice at the same property within 60 days. The system will just trigger a notification to the owner saying: *"Hey, guests have complained about hot water at B1 three times now, this needs a physical fix."*
* **Preventative Operations:** A checklist before each check-in that includes *"hot water working?"* This costs nothing and would have caught the issue before a guest discovered it at 3am.