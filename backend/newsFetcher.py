import os, requests, mysql.connector
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("NEWSAPI_KEY")
if not API_KEY:
    raise RuntimeError("Missing NEWSAPI_KEY in .env")

def fetch():
    """
    Fetch ultra–high-level news for finance bros / war bros / crypto / politics / future.
    """
    url = "https://newsapi.org/v2/everything"
    params = {
        "apiKey": API_KEY,
        "q": (
            "finance OR war OR economy OR politics OR crypto OR market trend OR future OR human OR AI OR energy"
        ),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 50
    }
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    items = resp.json().get("articles", [])

    results = []
    for a in items:
        # normalize source
        src = a.get("source")
        src_name = src.get("name") if isinstance(src, dict) else src

        results.append({
            "title":       a.get("title"),
            "url":         a.get("url"),
            "source":      src_name,
            "published_at": a.get("publishedAt"),
            "domain_tags": ",".join(classify_tags(a.get("description","") + " " + a.get("title",""))),
            "summary":     a.get("description")
        })
    return results

def classify_tags(text):
    """
    Tag text for finance, geopolitics, religion using keyword checks.
    Returns a Python list of matching tag strings.
    """
    tags = []
    lower_text = text.lower()
    if any(word in lower_text for word in ["economy", "deal", "oil", "money"]):
        tags.append("finance")
    if any(word in lower_text for word in ["war", "peace", "border", "conflict"]):
        tags.append("geopolitics")
    if any(word in lower_text for word in ["faith", "church", "mosque", "religion"]):
        tags.append("religion")
    return tags

def store(article):
    """
    Save each article to MySQL if not already stored.
    Uses 'INSERT IGNORE' to avoid duplicates.
    """
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
    )
    cursor = conn.cursor()

    # Normalize source: if it's dict use ["name"], else assume string
    src = article.get("source")
    src_name = src.get("name") if isinstance(src, dict) else src

    sql = """
      INSERT IGNORE INTO Articles
        (title, url, source, published_at, domain_tags, summary)
      VALUES (%s,%s,%s,%s,%s,%s)
    """
    cursor.execute(sql, (
        article.get("title"),
        article.get("url"),
        src_name,
        article.get("published_at"),
        article.get("domain_tags"),
        article.get("summary"),
    ))
    conn.commit()
    cursor.close()
    conn.close()

def rank_and_notify():
    """
    Among un-notified articles, find those tagged in all three domains,
    pick the most recent, mark it as notified, and print it.
    In production, send push email or SMS notification.
    """
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "mysql"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "rootpass"),
        database=os.getenv("DB_NAME", "alertsdb")
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Articles WHERE notified = FALSE")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Filter those with all three tags
    candidates = [
        r for r in rows 
        if r.get("domain_tags") and set(["finance", "geopolitics", "religion"]).issubset(set(r["domain_tags"].split(",")))
    ]
    if not candidates:
        return

    # Select most recent by published_at timestamp
    best = max(candidates, key=lambda r: r["published_at"] or datetime.min)

    # Mark this article as seen
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "mysql"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "rootpass"),
        database=os.getenv("DB_NAME", "alertsdb")
    )
    cursor = conn.cursor()
    cursor.execute("UPDATE Articles SET notified = TRUE WHERE id = %s", (best["id"],))
    conn.commit()
    cursor.close()
    conn.close()

    # Print the alert link
    print(f"ALERT: {best['title']} — {best['url']}")

if __name__ == "__main__":
    # If run directly, fetch news, store, and notify
    articles = fetch()
    for art in articles:
        store(art)
    rank_and_notify()