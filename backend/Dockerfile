FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (psycopg binary wheels usually avoid libpq, but keep ca-certs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install app + deps via pyproject (poetry-core backend)
COPY pyproject.toml poetry.lock* /app/
RUN pip install --no-cache-dir -U pip setuptools wheel \
  && pip install --no-cache-dir .

COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

