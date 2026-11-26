"""Gmail SMTP quota tracker, hard-break stopper, and follow-up cadence API endpoints."""

from flask import jsonify, request
from app.db import get_db
from app.smtp_stopper import SmtpQuotaManager
from app.followup_engine import FollowUpEngine
from app.routes.campaign_segments import serialize_doc


def register_campaign_safety_routes(bp):
    @bp.route("/smtp-stopper/status", methods=["GET"])
    def get_smtp_stopper_status():
        """Returns real-time 24h rolling SMTP quota status and hard-stop flags."""
        status = SmtpQuotaManager.get_status()
        return jsonify({"status": status})


    @bp.route("/smtp-stopper/hard-break", methods=["POST"])
    def trigger_manual_hard_break():
        """Manual emergency stop button for operator to freeze all campaigns instantly."""
        data = request.get_json() or {}
        reason = data.get("reason", "Operator manual emergency stop triggered from UI.")
        SmtpQuotaManager.trigger_hard_break(reason=reason, error_details="Manual operator action")
        return jsonify({
            "success": True,
            "message": "Emergency Gmail Mail Stopper engaged. All active campaigns hard-stopped.",
            "status": SmtpQuotaManager.get_status(),
        })


    @bp.route("/smtp-stopper/resume", methods=["POST"])
    def resume_from_hard_break():
        """Resumes campaigns and clears the emergency stopper flag."""
        res = SmtpQuotaManager.resume_and_clear_hard_break()
        return jsonify({
            "success": True,
            "message": res["message"],
            "campaigns_resumed": res.get("campaigns_resumed", 0),
            "status": SmtpQuotaManager.get_status(),
        })


    @bp.route("/smtp-stopper/reset-counter", methods=["POST"])
    def reset_smtp_counter():
        """Resets the 24h sent counter (e.g. after rotating credentials)."""
        status = SmtpQuotaManager.reset_counter()
        return jsonify({
            "success": True,
            "message": "24-hour SMTP sent counter successfully reset to 0.",
            "status": status,
        })


    @bp.route("/smtp-stopper/config", methods=["PATCH"])
    def update_smtp_stopper_config():
        """Configures safe daily limit (100-2000)."""
        data = request.get_json() or {}
        daily_limit = int(data.get("daily_limit", 450))
        auto_resume_hours = int(data.get("auto_resume_hours", 24))
        status = SmtpQuotaManager.configure_quota(daily_limit=daily_limit, auto_resume_hours=auto_resume_hours)
        return jsonify({
            "success": True,
            "message": f"SMTP daily limit configured to {daily_limit} emails/day.",
            "status": status,
        })

    @bp.route("/cadences", methods=["GET"])
    def list_followup_cadences():
        """Returns all omnichannel follow-up cadences."""
        cadences = FollowUpEngine.get_cadences()
        return jsonify({
            "cadences": [serialize_doc(c) for c in cadences],
            "total": len(cadences),
        })


    @bp.route("/cadences/enroll", methods=["POST"])
    def enroll_lead_in_cadence():
        """Enrolls a lead into an automated omnichannel cadence."""
        data = request.get_json() or {}
        lead_id = data.get("lead_id")
        cadence_id = data.get("cadence_id", "CAD-COMMERCIAL-OUTREACH")
        custom_params = data.get("custom_params", {})
        contact_id = data.get("contact_id")

        if not lead_id:
            return jsonify({"error": "lead_id is required"}), 400

        try:
            enrollment = FollowUpEngine.enroll_lead(
                lead_id=lead_id,
                cadence_id=cadence_id,
                custom_params=custom_params,
                contact_id=contact_id,
            )
            return jsonify({
                "success": True,
                "message": f"Lead #{lead_id} successfully enrolled in cadence '{enrollment.get('cadence_name')}'",
                "enrollment": serialize_doc(enrollment),
            }), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400


    @bp.route("/cadences/run-due", methods=["POST"])
    def run_due_followups():
        """Dispatches all due follow-up touchpoints across enrolled leads."""
        result = FollowUpEngine.execute_due_followups()
        return jsonify({
            "success": True,
            "result": result,
        })


    @bp.route("/cadences/enrollments", methods=["GET"])
    def list_cadence_enrollments():
        """Lists lead enrollments, including active steps and auto-paused states."""
        db = get_db()
        status_filter = request.args.get("status")
        q = {}
        if status_filter:
            q["status"] = status_filter
        enrollments = list(db.cadence_enrollments.find(q).sort("updated_at", -1).limit(50))
        return jsonify({
            "enrollments": [serialize_doc(e) for e in enrollments],
            "total": len(enrollments),
        })
