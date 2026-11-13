FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY migrations ./migrations
COPY seed ./seed
EXPOSE 8000
# Les migrations sont appliquées avant chaque démarrage
CMD ["sh", "-c", "aerich upgrade && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
