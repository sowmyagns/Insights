import sqlite3

con = sqlite3.connect("smrt.db")
cur = con.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [t[0] for t in cur.fetchall()]
print("Tables:", tables)

if "google_calendar_credentials" in tables:
    cur.execute("SELECT * FROM google_calendar_credentials")
    rows = cur.fetchall()
    print(f"google_calendar_credentials rows: {len(rows)}")
    for r in rows:
        print(" ", r[:4], "refresh_token=", bool(r[4] if len(r) > 4 else None))
else:
    print("ERROR: google_calendar_credentials table does NOT exist!")

cur.execute("SELECT id, title, google_calendar_event_id, google_meet_url FROM meetings")
rows = cur.fetchall()
print(f"meetings: {len(rows)}")
for r in rows:
    print(" ", r)

con.close()
