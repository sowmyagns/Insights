import sqlite3

conn = sqlite3.connect("backend/smrt.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("tables with gl:", [t for t in tables if "gl" in t.lower() or "account" in t.lower()])

for table in tables:
    if table == "gl_accounts":
        cur.execute(f"SELECT id, code, name, type, parent, balance, status FROM {table} LIMIT 20")
        rows = cur.fetchall()
        print(f"\n{table} sample ({len(rows)} shown):")
        for r in rows:
            print(r)
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        print("total:", cur.fetchone()[0])
        cur.execute(f"SELECT type, COUNT(*) FROM {table} GROUP BY type")
        print("by type:", cur.fetchall())
        cur.execute(f"SELECT name FROM {table} WHERE name IS NULL OR name = ''")
        null_names = cur.fetchall()
        print("null/empty names:", len(null_names))

conn.close()
