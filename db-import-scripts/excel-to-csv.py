"""
FARMER DB — Excel to CSV Converter
====================================
This script reads every sheet from your Excel file,
cleans the data (removes Total/summary rows),
and saves each sheet as a clean CSV ready for database import.

DEPENDENCIES TO INSTALL (run these in your terminal/command prompt):
    pip install pandas openpyxl

HOW TO RUN:
    1. Put this script in the same folder as your Excel file
    2. Open terminal / command prompt in that folder
    3. Run:  python convert_excel_to_csv.py
    4. You'll get a folder called  output_csvs  with one CSV per sheet
"""

import pandas as pd
import os

# ============================================================
# CONFIGURATION — change this to your actual Excel filename
# ============================================================
EXCEL_FILE = "python\data\Master Data PAN India Demographic_ Distributor_ Dealer_ Farmer - Atul 151225.xlsx"   # <-- change this to your actual filename

OUTPUT_FOLDER = "output_csvs"

# ============================================================
# Rows to SKIP — any row where the State or Zone column
# contains these words is a summary/total row, not real data
# ============================================================
SKIP_IF_CONTAINS = [
    "total", "grand total", "north total", "south total",
    "east total", "west total", "data received"
]

# ============================================================
# Sheet-specific column mappings
# These tell us which columns to keep and what to rename them
# ============================================================
SHEET_CONFIG = {

    "RM": {
        "keep_cols": ["Zone", "State 010426", "RM Name", "REGION 010426"],
        "rename": {
            "State 010426":  "state_name",
            "Zone":          "zone_name",
            "RM Name":       "rm_name",
            "REGION 010426": "region_name"
        },
        "skip_col": "Zone"   # skip row if this col contains a total keyword
    },

    "TM": {
        "keep_cols": ["Zone", "State 010426", "RM Name", "REGION 010426",
                      "TM Name", "TERRITORY 01042"],
        "rename": {
            "Zone":             "zone_name",
            "State 010426":     "state_name",
            "RM Name":          "rm_name",
            "REGION 010426":    "region_name",
            "TM Name":          "tm_name",
            "TERRITORY 01042":  "territory_name"
        },
        "skip_col": "Zone"
    },

    "Demographic info": {
        "keep_cols": ["State", "District", "Taluk", "VILLAGE NAME",
                      "GEOGRAPHICAL AREA (KM", "VILL POPULATIC",
                      "Acrea", "Hect", "Region", "Territory", "Zone"],
        "rename": {
            "State":                    "state_name",
            "District":                 "district",
            "Taluk":                    "taluk",
            "VILLAGE NAME":             "village_name",
            "GEOGRAPHICAL AREA (KM":    "geo_area_km2",
            "VILL POPULATIC":           "population",
            "Acrea":                    "acreage",
            "Hect":                     "hectares",
            "Region":                   "region_name",
            "Territory":                "territory_name",
            "Zone":                     "zone_name"
        },
        "skip_col": "State"
    },

    "Distributor": {
        "keep_cols": ["State", "Zone", "REGION", "TERRITORY",
                      "NAME OF DISTRIBUTOR (Firm Name)", "MOBILE I", "BUSINESS CATEGORY"],
        "rename": {
            "State":                          "state_name",
            "Zone":                           "zone_name",
            "REGION":                         "region_name",
            "TERRITORY":                      "territory_name",
            "NAME OF DISTRIBUTOR (Firm Name)":"firm_name",
            "MOBILE I":                       "mobile",
            "BUSINESS CATEGORY":              "business_category"
        },
        "skip_col": "State"
    },

    "Dealer": {
        "keep_cols": ["State", "Zone", "REGION", "TERRITORY",
                      "MARKET NAME", "Code", "NAME OF DEALER (Firm Name)",
                      "MOBILE N", "CATEGORY"],
        "rename": {
            "State":                        "state_name",
            "Zone":                         "zone_name",
            "REGION":                       "region_name",
            "TERRITORY":                    "territory_name",
            "MARKET NAME":                  "market_name",
            "Code":                         "dealer_code",
            "NAME OF DEALER (Firm Name)":   "firm_name",
            "MOBILE N":                     "mobile",
            "CATEGORY":                     "category"
        },
        "skip_col": "State"
    },

    "Farmer": {
        "keep_cols": ["State", "Zone", "REGION", "TERRITORY",
                      "MARKET NAME", "VILLAGE", "FARMER NAME",
                      "MOBILE N", "CATEGORY"],
        "rename": {
            "State":        "state_name",
            "Zone":         "zone_name",
            "REGION":       "region_name",
            "TERRITORY":    "territory_name",
            "MARKET NAME":  "market_name",
            "VILLAGE":      "village_name",
            "FARMER NAME":  "farmer_name",
            "MOBILE N":     "mobile",
            "CATEGORY":     "category"
        },
        "skip_col": "State"
    },

    "Farmer (2)": {
        "keep_cols": ["State", "Zone", "REGION", "TERRITORY",
                      "MARKET NAME", "VILLAGE", "FARMER NAME",
                      "MOBILE N", "CATEGORY"],
        "rename": {
            "State":        "state_name",
            "Zone":         "zone_name",
            "REGION":       "region_name",
            "TERRITORY":    "territory_name",
            "MARKET NAME":  "market_name",
            "VILLAGE":      "village_name",
            "FARMER NAME":  "farmer_name",
            "MOBILE N":     "mobile",
            "CATEGORY":     "category"
        },
        "skip_col": "State"
    },
}


# ============================================================
# MAIN LOGIC
# ============================================================
def clean_value(val):
    """Strip whitespace from string values."""
    if isinstance(val, str):
        return val.strip()
    return val


def is_total_row(row, col):
    """Return True if the row is a summary/total row we should skip."""
    val = str(row.get(col, "")).strip().lower()
    return any(keyword in val for keyword in SKIP_IF_CONTAINS)


def process_sheet(df, config):
    """Clean and filter a single sheet's dataframe."""

    # Normalise column names — strip extra spaces from headers
    df.columns = [str(c).strip() for c in df.columns]

    # Try to keep only the columns we care about
    # Some column names may be slightly different — do a fuzzy match
    available = list(df.columns)
    matched_cols = {}

    for wanted in config["keep_cols"]:
        # Exact match first
        if wanted in available:
            matched_cols[wanted] = wanted
        else:
            # Try partial match (handles truncated column names in Excel)
            for col in available:
                if wanted.lower()[:10] in col.lower() or col.lower()[:10] in wanted.lower():
                    matched_cols[wanted] = col
                    break

    if not matched_cols:
        print(f"  WARNING: No columns matched. Available columns: {available[:5]}")
        return None

    # Select matched columns and rename
    cols_to_select = list(set(matched_cols.values()))
    df = df[cols_to_select].copy()

    # Rename to our standard names
    reverse_map = {v: k for k, v in matched_cols.items()}
    df = df.rename(columns=reverse_map)
    df = df.rename(columns=config["rename"])

    # Strip whitespace from all string columns
    for col in df.columns:
        df[col] = df[col].apply(clean_value)

    # Remove total/summary rows
    skip_col = config.get("skip_col")
    if skip_col and skip_col in df.columns:
        before = len(df)
        df = df[~df[skip_col].apply(
            lambda v: any(kw in str(v).lower() for kw in SKIP_IF_CONTAINS)
        )]
        removed = before - len(df)
        if removed:
            print(f"  Removed {removed} summary/total rows")

    # Remove rows where all key columns are empty
    df = df.dropna(how="all")

    # Remove rows where the skip column is empty (blank separator rows)
    if skip_col and skip_col in df.columns:
        df = df[df[skip_col].notna() & (df[skip_col] != "")]

    return df


def main():
    if not os.path.exists(EXCEL_FILE):
        print(f"\nERROR: Cannot find '{EXCEL_FILE}'")
        print("Make sure this script is in the same folder as your Excel file")
        print("and that EXCEL_FILE at the top of this script matches your filename exactly.\n")
        return

    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    print(f"\nReading Excel file: {EXCEL_FILE}")
    xl = pd.ExcelFile(EXCEL_FILE)
    print(f"Sheets found: {xl.sheet_names}\n")

    farmers_combined = []  # We'll merge Farmer + Farmer (2) into one CSV

    for sheet_name in xl.sheet_names:
        if sheet_name not in SHEET_CONFIG:
            print(f"Skipping sheet: '{sheet_name}' (not in config)")
            continue

        print(f"Processing sheet: '{sheet_name}'")
        config = SHEET_CONFIG[sheet_name]

        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, header=0, dtype=str)
            df = process_sheet(df, config)

            if df is None or df.empty:
                print(f"  WARNING: No data extracted from '{sheet_name}'\n")
                continue

            print(f"  Rows after cleaning: {len(df):,}")

            # Farmer sheets get combined into one CSV
            if sheet_name in ("Farmer", "Farmer (2)"):
                farmers_combined.append(df)
                print(f"  Added to combined farmers CSV\n")
            else:
                safe_name = sheet_name.replace(" ", "_").replace("(", "").replace(")", "")
                out_path = os.path.join(OUTPUT_FOLDER, f"{safe_name}.csv")
                df.to_csv(out_path, index=False, encoding="utf-8-sig")
                print(f"  Saved: {out_path}\n")

        except Exception as e:
            print(f"  ERROR processing '{sheet_name}': {e}\n")

    # Save combined farmers
    if farmers_combined:
        combined = pd.concat(farmers_combined, ignore_index=True)
        out_path = os.path.join(OUTPUT_FOLDER, "farmers_combined.csv")
        combined.to_csv(out_path, index=False, encoding="utf-8-sig")
        print(f"Farmers combined: {len(combined):,} rows → {out_path}\n")

    # Print summary
    print("=" * 50)
    print("DONE! Files created in output_csvs folder:")
    for f in sorted(os.listdir(OUTPUT_FOLDER)):
        fpath = os.path.join(OUTPUT_FOLDER, f)
        size_kb = os.path.getsize(fpath) // 1024
        print(f"  {f}  ({size_kb:,} KB)")
    print("=" * 50)
    print("\nNext step: use these CSVs to import into SQL Server")


if __name__ == "__main__":
    main()