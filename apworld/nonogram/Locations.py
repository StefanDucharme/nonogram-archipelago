"""
Nonogram Locations

Defines all locations (checks) that can be sent to Archipelago.
Location IDs must match the client's AP_LOCATIONS constants.
"""

from typing import Dict, NamedTuple, Optional
from BaseClasses import Location


class NonogramLocationData(NamedTuple):
    """Data structure for location definitions."""
    code: Optional[int]  # None for event locations
    region: str


class NonogramLocation(Location):
    """Custom location class for Nonogram."""
    game: str = "Nonogram"


# Location ID ranges (must match client's useArchipelagoItems.ts):
# Milestones: 9000001
# Puzzle completion: 9001001-9001064 (one per puzzle)

location_table: Dict[str, NonogramLocationData] = {
    # === Milestone Checks ===
    "First Line Completed": NonogramLocationData(
        code=9000001,
        region="Puzzle Area"
    ),
}

# Generate locations for puzzles 1-64
for i in range(1, 65):
    location_table[f"Puzzle {i} Complete"] = NonogramLocationData(
        code=9001000 + i,
        region="Puzzle Area"
    )

# Add Victory event (no code)
location_table["Goal"] = NonogramLocationData(
    code=None,
    region="Puzzle Area"
)


def get_locations_by_region() -> Dict[str, list]:
    """Group locations by their region."""
    regions: Dict[str, list] = {}
    for name, data in location_table.items():
        if data.region not in regions:
            regions[data.region] = []
        regions[data.region].append(name)
    return regions
