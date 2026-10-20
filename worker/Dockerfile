FROM python:3.11-slim

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY main.py ./
COPY limits.json ./

# Expose port (default to 8000)
ENV PORT=8000

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT"]
