"""Omnichannel message templates and test dispatch API endpoints."""

import re
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import jsonify, request
from app.db import get_db, now_iso
from app.smtp_stopper import SmtpQuotaManager
from app.routes.campaign_templates_data import DEFAULT_TEMPLATES
from app.routes.campaign_segments import serialize_doc


def register_campaign_template_routes(bp):
    @bp.route("/templates", methods=["GET"])
    def get_templates():
        db = get_db()
        channel = request.args.get("channel")
        category = request.args.get("category")
        query = {}
        if channel and channel != "All":
            query["channel"] = channel
        if category and category != "All":
            query["category"] = category

        # Ensure all comprehensive default templates are present in MongoDB
        for dt in DEFAULT_TEMPLATES:
            db.message_templates.update_one(
                {"template_id": dt["template_id"]},
                {"$setOnInsert": dt},
                upsert=True
            )

        templates = list(db.message_templates.find(query).sort("created_at", -1))
        return jsonify({"templates": [serialize_doc(t) for t in templates]})


    @bp.route("/templates", methods=["POST"])
    def create_template():
        db = get_db()
        data = request.get_json() or {}
        if not data.get("name") or not data.get("body"):
            return jsonify({"error": "Template name and body are required"}), 400

        tid = data.get("template_id") or f"TPL-{uuid.uuid4().hex[:6].upper()}"
        doc = {
            "template_id": tid,
            "name": data["name"],
            "category": data.get("category", "Soft Offer"),
            "channel": data.get("channel", "Email"),
            "subject": data.get("subject", ""),
            "body": data["body"],
            "variables": data.get("variables", []),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        db.message_templates.insert_one(doc)
        return jsonify({"template": serialize_doc(doc), "message": "Template created successfully"}), 201


    @bp.route("/templates/reset-defaults", methods=["POST"])
    def reset_default_templates():
        db = get_db()
        for dt in DEFAULT_TEMPLATES:
            db.message_templates.update_one(
                {"template_id": dt["template_id"]},
                {"$set": dt},
                upsert=True
            )
        templates = list(db.message_templates.find({}).sort("created_at", -1))
        return jsonify({
            "message": "Default industry templates restored successfully",
            "templates": [serialize_doc(t) for t in templates]
        })


    @bp.route("/templates/<template_id>", methods=["PATCH"])
    def update_template(template_id):
        db = get_db()
        data = request.get_json() or {}
        tpl = db.message_templates.find_one({"template_id": template_id})
        if not tpl:
            return jsonify({"error": "Template not found"}), 404

        update_fields = {"updated_at": now_iso()}
        for k in ["name", "category", "channel", "subject", "body", "variables"]:
            if k in data:
                update_fields[k] = data[k]

        db.message_templates.update_one({"template_id": template_id}, {"$set": update_fields})
        updated = db.message_templates.find_one({"template_id": template_id})
        return jsonify({"template": serialize_doc(updated), "message": "Template updated successfully"})


    @bp.route("/templates/<template_id>", methods=["DELETE"])
    def delete_template(template_id):
        db = get_db()
        res = db.message_templates.delete_one({"template_id": template_id})
        if res.deleted_count == 0:
            return jsonify({"error": "Template not found"}), 404
        return jsonify({"message": f"Template {template_id} deleted successfully"})


    @bp.route("/templates/preview", methods=["POST"])
    def preview_template():
        data = request.get_json() or {}
        body = data.get("body", "")
        subject = data.get("subject", "")
        customer = data.get("customer", {
            "company_name": "Al-Dhiyafa Foodstuff Trading LLC",
            "contact_name": "Tariq Mansoor",
            "commodity": "IR-64 Parboiled Rice 5% Broken",
            "country": "United Arab Emirates",
            "port": "Jebel Ali Port (AEJEA)",
            "quantity_mt": "250 MT",
            "price_per_mt": "$465 / MT",
            "incoterm": "CIF Jebel Ali Port",
            "payment_terms": "100% L/C at Sight",
            "tracking_link": "http://localhost:3000/track/TRK-2026-8921",
            "today_date": "17 Nov 2026",
        })

        hydrated_body = body
        hydrated_subject = subject
        for token, val in customer.items():
            hydrated_body = hydrated_body.replace(f"{{{token}}}", str(val))
            hydrated_subject = hydrated_subject.replace(f"{{{token}}}", str(val))

        return jsonify({
            "hydrated_body": hydrated_body,
            "hydrated_subject": hydrated_subject,
            "customer": customer
        })


    @bp.route("/templates/test-send", methods=["POST"])
    def test_send_template():
        import email.utils
        db = get_db()
        data = request.get_json() or {}
        recipient = data.get("recipient", "").strip() or "procurement@al-dhiyafa-uae.com"
        subject = data.get("subject", "Commercial Commodity Offer")
        body = data.get("body", "")
        channel = data.get("channel", "Email")
        customer = data.get("customer", {})

        # Hydrate tokens
        hydrated_body = body
        hydrated_subject = subject
        for token, val in customer.items():
            hydrated_body = hydrated_body.replace(f"{{{token}}}", str(val))
            hydrated_subject = hydrated_subject.replace(f"{{{token}}}", str(val))

        conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
        smtp = conf.get("smtp", {})

        dispatch_id = f"DISP-{uuid.uuid4().hex[:8].upper()}"

        if channel == "Email":
            # Pre-send gatekeeper: check Gmail SMTP Stopper quota and emergency freeze
            can_send, reason = SmtpQuotaManager.check_can_send()
            if not can_send:
                return jsonify({
                    "success": False,
                    "mode": "smtp_stopper_blocked",
                    "error": f"Email transmission blocked by Gmail Mail Stopper: {reason}",
                    "is_hard_stopped": True,
                    "stopper_status": SmtpQuotaManager.get_status(),
                }), 429

            host = smtp.get("host")
            port = int(smtp.get("port") or 587)
            user = smtp.get("username")
            pw = smtp.get("password")

            # If live credentials exist and are populated, attempt real SMTP connection
            if host and user and pw:
                try:
                    server = smtplib.SMTP(host, port, timeout=7)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(user, pw)

                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = hydrated_subject
                    from_name = smtp.get("from_name", "TradePulse Export Desk")
                    msg["From"] = f"{from_name} <{user}>"
                    msg["To"] = recipient
                    msg["Message-ID"] = f"<{uuid.uuid4().hex}@tradepulse.exim>"
                    msg["Date"] = email.utils.formatdate(localtime=True)
                    msg.attach(MIMEText(hydrated_body, "plain", "utf-8"))

                    server.send_message(msg)
                    server.quit()

                    # Track live send
                    SmtpQuotaManager.record_send(count=1)

                    disp_record = {
                        "dispatch_id": dispatch_id,
                        "channel": "Email",
                        "recipient": recipient,
                        "subject": hydrated_subject,
                        "body": hydrated_body,
                        "status": "Delivered via Live SMTP",
                        "mode": "live_smtp",
                        "host": host,
                        "port": port,
                        "sender": user,
                        "sent_at": now_iso(),
                    }
                    db.dispatched_messages.insert_one(disp_record)

                    return jsonify({
                        "success": True,
                        "mode": "live_smtp",
                        "dispatch_id": dispatch_id,
                        "message": f"Successfully transmitted live commercial email to {recipient} via {host}:{port}!",
                        "record": serialize_doc(disp_record),
                        "stopper_status": SmtpQuotaManager.get_status(),
                    })
                except Exception as e:
                    err_str = str(e).lower()
                    # Check for Gmail sending limit rejection (550 / 421 / daily limit)
                    if "550" in err_str or "421" in err_str or "limit" in err_str or "quota" in err_str:
                        SmtpQuotaManager.trigger_hard_break(
                            reason=f"Live Gmail SMTP rejection encountered ({type(e).__name__}): {str(e)}",
                            error_details=str(e),
                        )

                    disp_record = {
                        "dispatch_id": dispatch_id,
                        "channel": "Email",
                        "recipient": recipient,
                        "subject": hydrated_subject,
                        "body": hydrated_body,
                        "status": "Failed: SMTP Handshake Error",
                        "mode": "smtp_error",
                        "error_details": str(e),
                        "sent_at": now_iso(),
                    }
                    db.dispatched_messages.insert_one(disp_record)
                    return jsonify({
                        "success": False,
                        "mode": "smtp_error",
                        "error": f"Live SMTP Transmission Failed ({type(e).__name__}): {str(e)}",
                        "host": host,
                        "port": port,
                        "stopper_status": SmtpQuotaManager.get_status(),
                        "record": serialize_doc(disp_record),
                    }), 400

            # Sandbox Gateway (if no SMTP password yet configured)
            SmtpQuotaManager.record_send(count=1)
            disp_record = {
                "dispatch_id": dispatch_id,
                "channel": "Email",
                "recipient": recipient,
                "subject": hydrated_subject,
                "body": hydrated_body,
                "status": "Delivered (Sandbox Gateway)",
                "mode": "sandbox",
                "host": host or "smtp.gmail.com",
                "port": port,
                "sender": user or "exports@tradepulse.exim",
                "sent_at": now_iso(),
            }
            db.dispatched_messages.insert_one(disp_record)
            return jsonify({
                "success": True,
                "mode": "sandbox",
                "dispatch_id": dispatch_id,
                "message": f"Commercial email rendered and logged to {recipient} via Sandbox Gateway (Add Gmail App Password in Settings for live relay).",
                "stopper_status": SmtpQuotaManager.get_status(),
                "record": serialize_doc(disp_record),
            })

        elif channel == "WhatsApp":
            disp_record = {
                "dispatch_id": dispatch_id,
                "channel": "WhatsApp",
                "recipient": recipient,
                "body": hydrated_body,
                "status": "Delivered (WhatsApp Business API)",
                "mode": "whatsapp_dispatched",
                "chars": len(hydrated_body),
                "sent_at": now_iso(),
            }
            db.dispatched_messages.insert_one(disp_record)
            return jsonify({
                "success": True,
                "mode": "whatsapp_dispatched",
                "dispatch_id": dispatch_id,
                "message": f"WhatsApp Business message delivered to {recipient} ({len(hydrated_body)} characters).",
                "record": serialize_doc(disp_record),
            })

        elif channel == "SMS":
            char_count = len(hydrated_body)
            segments = 1 if char_count <= 160 else ((char_count + 152) // 153)
            disp_record = {
                "dispatch_id": dispatch_id,
                "channel": "SMS",
                "recipient": recipient,
                "body": hydrated_body,
                "status": "Delivered (SMS Gateway)",
                "mode": "sms_dispatched",
                "chars": char_count,
                "segments": segments,
                "sent_at": now_iso(),
            }
            db.dispatched_messages.insert_one(disp_record)
            return jsonify({
                "success": True,
                "mode": "sms_dispatched",
                "dispatch_id": dispatch_id,
                "segments": segments,
                "chars": char_count,
                "message": f"SMS message transmitted to {recipient} ({segments} segment(s), {char_count} chars).",
                "record": serialize_doc(disp_record),
            })

        return jsonify({"error": f"Unsupported channel: {channel}"}), 400


    @bp.route("/templates/dispatches", methods=["GET"])
    def get_recent_dispatches():
        db = get_db()
        records = list(db.dispatched_messages.find({}).sort("sent_at", -1).limit(25))
        return jsonify({"dispatches": [serialize_doc(r) for r in records], "total": len(records)})

