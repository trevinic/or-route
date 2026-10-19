# =============================================================================
# Dockerfile per OptiFleet RO - Piattaforma di Ricerca Operativa
# Include: Python 3.11 Slim, Solutore COIN-OR CBC, Librerie GIS/OSM e Server REST
# =============================================================================

FROM python:3.11-slim-bookworm

# Disabilita buffering per output immediato nei log di produzione
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8085

# Imposta la directory di lavoro
WORKDIR /app

# 1. Installazione dipendenze di sistema e solutore binario CBC (COIN-OR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    coinor-cbc \
    coinor-libcbc-dev \
    libgeos-dev \
    libspatialindex-dev \
    gdal-bin \
    libgdal-dev \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia e installazione dipendenze Python (layer caching)
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Copia del codice sorgente dell'applicazione
COPY . /app/

# 4. Creazione directory necessarie per runtime
RUN mkdir -p /app/data /app/output /app/web

# 5. Esposizione della porta di ascolto
EXPOSE 8085

# 6. Healthcheck per monitoraggio container su Cloud (Render, Fly.io, Cloud Run, Docker)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# 7. Avvio del server applicativo multi-thread
CMD ["python", "server.py"]
