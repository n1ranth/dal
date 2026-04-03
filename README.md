# DAL — AI-Powered Dataset Analyzer

A full-stack application for automated dataset inspection, quality evaluation, and AI-assisted preprocessing.

## Overview

**DAL (Dataset Analyzer & Logger)** is designed to accelerate the data preparation lifecycle. It ingests structured datasets and produces:

* Data quality diagnostics
* Bias and leakage detection
* Cleaning and preprocessing recommendations
* ML-readiness assessments

The system targets developers, data scientists, and ML engineers who want rapid, actionable insights before model training.

## Core Capabilities

* **Multi-format Ingestion:**
  Supports CSV, JSON, XLSX, and Parquet.
* **Data Quality Scoring:**
  Evaluates completeness, consistency, and structural integrity.
* **Bias & Leakage Detection:**
  Identifies skewed distributions, proxy variables, and leakage risks.
* **AI-Assisted Recommendations:**
  Suggests transformations, imputations, and feature-level fixes.
* **Visualization Layer:**
  Interactive charts for distributions and feature relationships.
* **Low-Latency Processing:**
  Near real-time analysis with structured outputs.

## Architecture

### Frontend

* Next.js (App Router)
* React (latest stable)
* TypeScript (strict mode)
* Tailwind CSS + shadcn/ui
* React Three Fiber (visual layer enhancements)

### Backend

* Python-based REST API
* Containerized via Docker
* Modular analysis pipeline:
  * `ai/` → inference + reasoning layer
  * `analyzer/` → structured report generation

## Repository Structure

```
.root
├── src
│   ├── backend
│   │   ├── ai/          # Model interaction + reasoning
│   │   └── analyzer/    # Output generation + scoring
│   │
│   └── frontend
│       ├── app/         # Next.js App Router
│       ├── components/  # UI components
│       ├── lib/         # Utilities and config
│       └── public/      # Static assets
│
└── README.md
```

## Setup

### Prerequisites

* Node.js ≥ 18
* npm or yarn
* Python ≥ 3.8
* Docker

## Installation

### 1. Clone

```bash
git clone <repository-url>
cd <repository>
```

### 2. Frontend Setup

```bash
cd src/frontend
npm install
```

### 3. Backend Setup (Docker)

```bash
cd src/backend
docker build -t dal-backend .
```

### 4. Environment Configuration

#### Backend

```bash
cd src/backend
cp .env.example .env
```

Edit `.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
```

#### Frontend

```bash
cd src/frontend
```

Create `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5. Run Services

#### Backend

```bash
docker run -p 8000:8000 dal-backend
```

If permission issues occur:

```bash
sudo docker run -p 8000:8000 dal-backend
```

#### Frontend

```bash
cd src/frontend
npm run dev
```

### 6. Access

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend: [http://localhost:8000](http://localhost:8000)

## API Surface

| Method | Endpoint             | Description                         |
| ------ | -------------------- | ----------------------------------- |
| POST   | `/analyze`           | Upload + analyze dataset            |
| POST   | `/apply_suggestions` | Apply preprocessing recommendations |

## Usage Flow

1. Upload dataset (drag/drop or file picker)
2. Inspect generated sections:
   * Dataset summary
   * Visualizations
   * Insights
   * Bias analysis
   * Suggestions
   * Activity logs
3. Apply recommended transformations

## Development

### Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production runtime
npm run lint     # Linting
```

