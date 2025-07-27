from celery import Celery              # Core Celery library for task scheduling
from newsFetcher import fetch, store, rank_and_notify  # Fetch/store logic we've defined
import os

# Initialize Celery with Redis (default) broker URL from env
app = Celery('worker', broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"))

@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """
    Schedule our task_run task to run every 15 seconds.
    Equivalent to a cron job inside Celery.
    """
    sender.add_periodic_task(
        15.0, 
        task_run.s(), 
        name="Fetch & process news every 15 seconds"
    )

@app.task
def task_run():
    """
    The Celery task that fetches news, stores, and sends alert.
    """
    print("🔔 task_run started")
    articles = fetch()
    print(f"  → fetched {len(articles)} articles")
    for art in articles:
        store(art)
    rank_and_notify()
    print("🔔 task_run finished")