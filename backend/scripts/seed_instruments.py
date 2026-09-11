"""
Seed script — Load default instruments from seeds/instruments.json into the database.

Usage:
    cd backend
    python -m scripts.seed_instruments
"""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.database import async_session_factory, engine
from app.models import Base
from app.models.instrument import Instrument


async def seed_instruments():
    """Load instruments from seeds/instruments.json."""
    seed_file = Path(__file__).parent.parent / "seeds" / "instruments.json"

    if not seed_file.exists():
        print(f"❌ Seed file not found: {seed_file}")
        return

    with open(seed_file) as f:
        instruments_data = json.load(f)

    print(f"📦 Loading {len(instruments_data)} instruments from {seed_file}")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        for data in instruments_data:
            # Check if already exists
            result = await session.execute(
                select(Instrument).where(Instrument.symbol == data["symbol"].upper())
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"  ⏭️  {data['symbol']} — already exists, skipping")
                continue

            instrument = Instrument(
                symbol=data["symbol"].upper(),
                name=data["name"],
                category=data["category"],
                contract_size=data["contract_size"],
                tick_size=data["tick_size"],
                tick_value=data["tick_value"],
                margin_currency=data.get("margin_currency", "USD"),
                leverage=data.get("leverage"),
                stop_out_percent=data.get("stop_out_percent"),
                description=data.get("description"),
            )
            session.add(instrument)
            print(f"  ✅ {data['symbol']} — created (contract_size={data['contract_size']})")

        await session.commit()

    print(f"\n✅ Done! {len(instruments_data)} instruments seeded.")


if __name__ == "__main__":
    asyncio.run(seed_instruments())
