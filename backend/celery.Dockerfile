FROM python:3.11

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

CMD ["celery", "-A", "celeryWorker", "worker", "--beat", "--loglevel=info"]