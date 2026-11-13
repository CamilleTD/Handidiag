FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir "fastapi[standard]>=0.115,<1" "tortoise-orm[asyncpg]>=0.25,<2" \
    "aerich>=0.9,<1" "pydantic-settings>=2.7,<3" "argon2-cffi>=23,<26" "tzdata>=2024.1"
COPY app ./app
COPY migrations ./migrations
COPY seed ./seed
EXPOSE 8000
# Les migrations sont appliquées avant chaque démarrage
CMD ["sh", "-c", "aerich upgrade && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
