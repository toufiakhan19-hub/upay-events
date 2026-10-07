"""Load test for the AI service.

Fires concurrent requests at a running service and reports latency
percentiles, throughput and errors. Results are printed as a Markdown table and
saved to docs/load-test-results.json.

Start the service first (`npm run ai:dev`), then from the repository root:

    python ai/tests/loadtest.py
    python ai/tests/loadtest.py --url https://<ai-service-host>
"""

import argparse
import asyncio
import json
import platform
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

RESULTS_PATH = Path(__file__).resolve().parents[2] / "docs" / "load-test-results.json"
EVENT_ID = "01JQ8W1A2B3C4D5E6F7G8H9J0KM"

CATEGORIES = ["hackathon", "workshop", "cultural", "career_fair", "conference", "sports", "other"]
LOCATIONS = ["campus", "city", "online"]
REMINDERS = ["none", "sent", "opened", "confirmed"]

SCENARIOS = [
    # name, total requests, concurrency, registrations per request
    ("Forecast, 500 registrations, one at a time", 20, 1, 500),
    ("Forecast, 50 registrations", 100, 100, 50),
    ("Forecast, 500 registrations", 100, 100, 500),
    ("Forecast, 2,000 registrations (contract max)", 20, 10, 2000),
]


def registration(index: int) -> dict:
    return {
        "registration_id": f"01JQ8W7XK9M4N2P8Q3R6{index:07d}",
        "event_id": EVENT_ID,
        "event_category": CATEGORIES[index % len(CATEGORIES)],
        "ticket_price_taka": [0, 100, 300, 500][index % 4],
        "days_before_event_registered": index % 31,
        "payment_delay_hours": None if index % 9 == 0 else float(index % 72),
        "event_day_of_week": 1 + index % 7,
        "event_start_hour": 8 + index % 14,
        "location_type": LOCATIONS[index % len(LOCATIONS)],
        "reminder_status": REMINDERS[index % len(REMINDERS)],
        "prior_attendance_count": index % 11,
        "is_cancelled": index % 25 == 0,
    }


def forecast_body(rows: int) -> dict:
    return {
        "event_id": EVENT_ID,
        "event_capacity": max(rows, 1) + 50,
        "event_date_time": "2026-12-14T09:00:00+06:00",
        "as_of": "2026-12-10T09:00:00Z",
        "registrations": [registration(i) for i in range(rows)],
    }


def percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    k = (len(ordered) - 1) * pct / 100
    low, high = int(k), min(int(k) + 1, len(ordered) - 1)
    return ordered[low] + (ordered[high] - ordered[low]) * (k - low)


async def run_scenario(client: httpx.AsyncClient, name: str, total: int, concurrency: int, rows: int) -> dict:
    body = forecast_body(rows)
    semaphore = asyncio.Semaphore(concurrency)
    latencies: list[float] = []
    errors = 0

    async def one() -> None:
        nonlocal errors
        async with semaphore:
            started = time.perf_counter()
            try:
                response = await client.post("/predict/forecast", json=body)
                ok = response.status_code == 200
            except httpx.HTTPError:
                ok = False
            elapsed = (time.perf_counter() - started) * 1000
            if ok:
                latencies.append(elapsed)
            else:
                errors += 1

    started = time.perf_counter()
    await asyncio.gather(*(one() for _ in range(total)))
    wall = time.perf_counter() - started

    result = {
        "scenario": name,
        "requests": total,
        "concurrency": concurrency,
        "registrations_per_request": rows,
        "errors": errors,
        "throughput_rps": round(total / wall, 1),
        "wall_seconds": round(wall, 2),
    }
    if latencies:
        result.update(
            {
                "p50_ms": round(statistics.median(latencies)),
                "p95_ms": round(percentile(latencies, 95)),
                "p99_ms": round(percentile(latencies, 99)),
                "max_ms": round(max(latencies)),
            }
        )
    return result


async def main(url: str) -> None:
    limits = httpx.Limits(max_connections=200, max_keepalive_connections=200)
    async with httpx.AsyncClient(base_url=url, timeout=60, limits=limits) as client:
        health = (await client.get("/health")).json()
        if not health.get("model_loaded"):
            raise SystemExit(f"Service at {url} is not ready: {health}")
        await client.post("/predict/forecast", json=forecast_body(10))  # warm-up

        results = [await run_scenario(client, *scenario) for scenario in SCENARIOS]

    report = {
        "run_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "target": url,
        "model_version": health.get("model_version"),
        "machine": f"{platform.system()} {platform.release()}, {platform.processor() or platform.machine()}",
        "server": "single uvicorn worker",
        "results": results,
    }
    RESULTS_PATH.write_text(json.dumps(report, indent=2) + "\n")

    print("| Scenario | Requests | Concurrency | Errors | p50 | p95 | p99 | Max | Throughput |")
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for r in results:
        print(
            f"| {r['scenario']} | {r['requests']} | {r['concurrency']} | {r['errors']} | "
            f"{r.get('p50_ms', '-')} ms | {r.get('p95_ms', '-')} ms | {r.get('p99_ms', '-')} ms | "
            f"{r.get('max_ms', '-')} ms | {r['throughput_rps']} req/s |"
        )
    print(f"\nSaved to {RESULTS_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    asyncio.run(main(parser.parse_args().url))
