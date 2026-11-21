FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN groupadd -g 1000 app && useradd -u 1000 -g 1000 -m app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY stats.py .

USER 1000:1000

EXPOSE 8000

CMD ["python", "stats.py"]