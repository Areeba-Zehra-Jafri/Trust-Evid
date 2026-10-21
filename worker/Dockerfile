FROM python:3.11-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Package every worker module so the runtime import graph cannot be truncated.
COPY *.py ./
COPY limits.json ./
ENV PORT=8000
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
