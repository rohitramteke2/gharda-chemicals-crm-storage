# Server Setup Guide
## One-time setup to run the farmer DB import on GCL-SAP-DB

---

## Python Version
Use Python 3.11.x — most stable, widely compatible with all 3 modules.
Download: https://www.python.org/downloads/release/python-3119/
Pick: Windows installer (64-bit)

Do NOT use Python 3.13 — pyodbc has known issues with it.
Do NOT use Python 3.7 or below — pandas 2.x requires 3.8+.

---

## Step 1 — Install Python on the Server
1. Download Python 3.11.9 (64-bit) from python.org
2. Run the installer
3. IMPORTANT: tick "Add Python to PATH" before clicking Install
4. Click "Install Now"

Verify in Command Prompt:
    python --version
Should show: Python 3.11.x

---

## Step 2 — Install ODBC Driver (if not already on server)
Since SQL Server IS on this machine, ODBC Driver is likely already installed.
Check first:
    Run → odbcad32.exe → Drivers tab
    Look for "ODBC Driver 17 for SQL Server"

If not present, download from:
    https://aka.ms/downloadmsodbcsql
    Pick: ODBC Driver 17 for SQL Server (x64)

---

## Step 3 — Copy these files to the server
Copy this entire folder to the server (e.g. C:\farmer_import\):

    farmer_import\
        import-to-sql-server.py
        requirements.txt
        output_csvs\
            RM.csv
            TM.csv
            Demographic_info.csv
            Distributor.csv
            Dealer.csv
            farmers_combined.csv   (112 MB — largest file)

---

## Step 4 — Install Python modules
Open Command Prompt on the server, go to the folder:
    cd C:\farmer_import
    pip install -r requirements.txt

---

## Step 5 — Update connection string in script
Since the script runs ON the same machine as SQL Server,
open import-to-sql-server.py and change:

    "server": "172.16.0.50",
TO:
    "server": "localhost",

Also make sure password is filled in:
    "password": "YOUR_ACTUAL_PASSWORD",

---

## Step 6 — Run the import
    python import-to-sql-server.py

Expected output:
    Connected to SQL Server successfully!
    [HH:MM:SS] STEP 1: Loading Regions and Regional Managers...
    [HH:MM:SS] STEP 2: Loading Territories...
    ...
    [HH:MM:SS] farm_farmers    1,262,634
    [HH:MM:SS] ALL DONE!

Total time estimate: 15-30 minutes (mostly the farmers step)

---

## Troubleshooting

ERROR: No module named 'pyodbc'
    → Run: pip install pyodbc

ERROR: Can't find ODBC Driver 17
    → Install it from https://aka.ms/downloadmsodbcsql

ERROR: Cannot find folder 'output_csvs'
    → Make sure output_csvs folder is in the same folder as the script
    → Or set full path in script: CSV_FOLDER = r"C:\farmer_import\output_csvs"

ERROR: Login failed for user 'zoho'
    → Double-check password in DB_CONFIG in the script

ERROR: Cannot open database "ZOHO"
    → Confirm ZOHO database exists and zoho user has access