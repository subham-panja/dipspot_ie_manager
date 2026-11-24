"""Bulk lead update and delete endpoints."""

from bson import ObjectId
from flask import jsonify, request
from app.db import get_db, now_iso
from app.models import Lead, db


def register_bulk_routes(bp):
    @bp.route("/leads/bulk-update", methods=["POST"])
    def bulk_update_leads():
        """Batch updates status or attributes across multiple leads in one atomic operation."""
        mongo_db = get_db()
        data = request.get_json(silent=True) or {}
        ids = data.get("ids") or []
        updates = data.get("updates") or {}
        for k in ["deal_status", "importer_tier", "custom_label", "priority_score", "risk_tier", "stage_id"]:
            if k in data and k not in updates:
                updates[k] = data[k]

        if not ids or not updates:
            return jsonify({"error": "ids and updates are required"}), 400

        id_conditions = []
        for i in ids:
            try:
                id_conditions.append({"id": int(i)})
            except (ValueError, TypeError):
                pass
            id_conditions.append({"id": str(i)})
            if ObjectId.is_valid(str(i)):
                id_conditions.append({"_id": ObjectId(str(i))})

        updates["updated_at"] = now_iso()
        result = mongo_db.leads.update_many({"$or": id_conditions}, {"$set": updates})
        return jsonify({
            "success": True,
            "matched_count": result.matched_count,
            "modified_count": result.modified_count,
            "message": f"Successfully updated {result.modified_count} leads",
        })


    @bp.route("/leads/bulk-delete", methods=["POST"])
    def bulk_delete_leads():
        """Batch soft-deletes (or permanently deletes) multiple leads in one atomic operation."""
        mongo_db = get_db()
        data = request.get_json(silent=True) or {}
        ids = data.get("ids") or []
        permanent = bool(data.get("permanent", False))
        if not ids:
            return jsonify({"error": "ids is required"}), 400

        id_conditions = []
        for i in ids:
            try:
                id_conditions.append({"id": int(i)})
            except (ValueError, TypeError):
                pass
            id_conditions.append({"id": str(i)})
            if ObjectId.is_valid(str(i)):
                id_conditions.append({"_id": ObjectId(str(i))})

        if permanent:
            result = mongo_db.leads.delete_many({"$or": id_conditions})
            count = result.deleted_count
        else:
            result = mongo_db.leads.update_many(
                {"$or": id_conditions},
                {"$set": {"is_deleted": True, "deleted_at": now_iso()}}
            )
            count = result.modified_count

        return jsonify({
            "success": True,
            "deleted_count": count,
            "message": f"Successfully {'permanently deleted' if permanent else 'soft-deleted'} {count} leads",
        })

