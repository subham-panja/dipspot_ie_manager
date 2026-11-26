"""AI inbound intent classification and contextual smart draft generation."""

from typing import Any, Dict, Optional


def classify_inbound_intent(text: str) -> Dict[str, Any]:
    """AI Intent & Sentiment Classifier for inbound commercial inquiries."""
    text_low = text.lower()

    # 1. Unsubscribe / Negative (Safety & Opt-Out Priority)
    if any(k in text_low for k in ["stop", "unsubscribe", "not interested", "remove", "do not contact", "cancel"]):
        return {
            "intent": "Unsubscribe / Opt-Out",
            "sentiment": "Negative",
            "urgency": "Immediate",
            "badge_color": "rose",
            "suggested_action": "Blacklist from Outreach Cadences",
        }

    # 2. Price Objection / Negotiation (Evaluate before general commodity/MT keywords)
    if any(k in text_low for k in ["too high", "expensive", "discount", "cheaper", "better price", "competitor", "counter"]):
        return {
            "intent": "Price Negotiation / Counter-Offer",
            "sentiment": "Neutral",
            "urgency": "High",
            "badge_color": "amber",
            "suggested_action": "Offer Volume Discount for 5+ Containers",
        }

    # 3. High Purchase Intent / RFQ
    if any(k in text_low for k in ["quote", "price", "cif", "fob", "mt", "container", "interested", "specification", "coi", "payment term"]):
        return {
            "intent": "High Commercial Intent (RFQ)",
            "sentiment": "Positive",
            "urgency": "High",
            "badge_color": "emerald",
            "suggested_action": "Issue Formal Proforma Invoice / Soft Offer",
        }

    # 4. Out of office / generic
    if any(k in text_low for k in ["out of office", "auto reply", "away until", "vacation"]):
        return {
            "intent": "Out of Office / Auto-Reply",
            "sentiment": "Neutral",
            "urgency": "Low",
            "badge_color": "slate",
            "suggested_action": "Snooze Sequence for 5 Days",
        }

    return {
        "intent": "General Inquiry",
        "sentiment": "Neutral",
        "urgency": "Medium",
        "badge_color": "cyan",
        "suggested_action": "Send Company Catalog & Product Specs",
    }


def generate_ai_smart_draft(
    customer: dict,
    last_message: str = "",
    intent_info: Optional[dict] = None,
    channel: str = "Email",
) -> str:
    """Generates an AI True-Native contextual commercial counter-offer."""
    company = customer.get("company_name") or customer.get("lead_name") or "Valued Partner"
    contact = customer.get("contact_person") or "Purchasing Director"
    country = customer.get("country") or customer.get("lead_country") or "your market"
    commodity = customer.get("matched_varieties") or "Export Grade Rice"
    port = customer.get("nearest_port") or "your nearest container port"

    if intent_info is None:
        intent_info = classify_inbound_intent(last_message) if last_message else {"intent": customer.get("latest_intent", "")}

    intent = intent_info.get("intent", "")

    if channel.lower() == "whatsapp":
        if "RFQ" in intent or "Commercial Intent" in intent or "quote" in last_message.lower():
            return (
                f"Hi {contact}, thank you for reaching out to TradePulse EXIM regarding {company}. "
                f"We can quote spot CIF {port} for prompt shipment of {commodity} (SGS inspected). "
                f"Would you prefer 25kg or 50kg bags, and what is your target monthly tonnage?"
            )
        if "Negotiation" in intent:
            return (
                f"Hello {contact}, regarding pricing for {company}: We can offer a $12/MT rebate for a 5-container booking to {port}. "
                f"Shall we issue a formal revised SCO today?"
            )
        return f"Hello {contact}, following up regarding {company}'s import requirements for {commodity} to {port}. Let us know your delivery timeline."

    if "RFQ" in intent or "Commercial Intent" in intent:
        return (
            f"Dear {contact},\n\n"
            f"Thank you for your prompt response regarding {commodity} for {company}. "
            f"We are pleased to quote our current spot benchmark for immediate shipment to {port}:\n\n"
            f"• Commodity: {commodity} (Inspection by SGS / Bureau Veritas at loading)\n"
            f"• Packing: 50 kg PP bags (Custom buyer branding available)\n"
            f"• Minimum Order: 2 x 20ft FCL (52 MT)\n"
            f"• Payment Terms: 100% Irrevocable Confirmed L/C at Sight or 20% Advance / 80% BL copy\n\n"
            f"Would you prefer this quotation structured on FOB Indian Port or CIF {port} basis?"
        )
    if "Negotiation" in intent:
        return (
            f"Dear {contact},\n\n"
            f"We understand your price sensitivity for {company}'s market in {country}. "
            f"To establish a long-term trade relationship for {commodity}, we can adjust our rate by $12/MT "
            f"provided we can contract a minimum 5-container trial allocation (130 MT) for shipment this month.\n\n"
            f"Please let us know if we should issue a formal revised SCO under these terms."
        )
    return (
        f"Dear {contact},\n\n"
        f"Thank you for contacting our commercial export desk regarding {company}. "
        f"We specialize in containerized shipments of {commodity} directly to {port}.\n\n"
        f"Please let us know your required delivery schedule and volume so we can reserve your milling allocation."
    )
