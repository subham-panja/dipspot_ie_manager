import argparse
import socket
from app.factory import create_app
from app.models import Lead
from app.tasks import seed_importers, seed_wb_mills


def find_available_port(default_port: int = 5001) -> int:
    for port in range(default_port, default_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return default_port


app = create_app()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rice Lead Engine Web Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=None, help="Port (default: 5001 or first available)")
    parser.add_argument("--seed", action="store_true", help="Auto-seed initial verified leads on startup")
    parser.add_argument("--debug", action="store_true", help="Enable Flask debug mode")
    args = parser.parse_args()

    if args.seed:
        with app.app_context():
            from app.db import get_db, seed_demo_data
            mongo_db = get_db()
            if mongo_db.leads.count_documents({}) == 0:
                print("Initializing MongoDB with verified seed trade data...")
                stats = seed_demo_data(mongo_db)
                print(f"Seeded MongoDB demo dataset: {stats}")

    port = args.port or find_available_port(5001)
    print(f"\nRice Lead Engine running at http://{args.host}:{port}\n")
    app.run(host=args.host, port=port, debug=args.debug)
