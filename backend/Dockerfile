# Use Python 3.11 (matches runtime.txt)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend files
COPY . /app

# Upgrade pip and install dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Expose backend port
EXPOSE 8000

# Start FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
