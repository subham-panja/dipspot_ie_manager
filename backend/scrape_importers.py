#!/usr/bin/env python3
import argparse
import csv
import os
from app.factory import create_app
from app.models import Lead
from app.routes.api import CSV_EXPORT_FIELDS
from app.tasks import run_importer_scrape_thread, seed_importers


def main():
    parser = argparse.ArgumentParser(description="Global & Middle East Non-Basmati Rice Importer Scraper CLI")
    parser.add_argument("--output", default="output/importers_leads.csv", help="Output CSV path")
    parser.add_argument("--seed-only", action="store_true", help="Only load offline verified seeds without live scraping")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if args.seed_only:
            print("Seeding verified Middle East importer leads...")
            seed_importers(app)
        else:
            print("Running full importer scraper pipeline across live directories and verified seeds...")
            run_importer_scrape_thread(app, None)

        leads = Lead.query.filter_by(lead_type="importer").order_by(Lead.priority_score.desc()).all()
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_EXPORT_FIELDS, extrasaction="ignore")
            writer.writeheader()
            for l in leads:
                writer.writerow(l.to_dict())

        print(f"Exported {len(leads)} verified importer leads to {args.output}")


if __name__ == "__main__":
    main()
