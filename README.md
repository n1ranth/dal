# DAL - AI Powered Dataset Analyzer

A modern web application for dataset analysis and insights powered by AI.

## Overview

DAL (Dataset Analyzer & Logger) is a comprehensive tool that provides AI-driven analysis of datasets, offering insights into data quality, potential biases, cleaning recommendations, and ML impact assessments.

## Features

- **Dataset Upload & Analysis**: Support for CSV, JSON, XLSX, and Parquet files
- **Quality Scoring**: Automated assessment of dataset completeness and quality metrics
- **Bias Detection**: Identification of potential biases and data leakage risks
- **Smart Suggestions**: AI-powered recommendations for data cleaning and preprocessing
- **Interactive Visualizations**: Charts and graphs for data distribution analysis
- **Real-time Processing**: Fast analysis with detailed reporting

## Tech Stack

### Frontend
- **Framework**: Next.js 16.2.2 with React 19.2.4
- **Styling**: Tailwind CSS 4.2.2 with shadcn/ui components
- **3D Graphics**: React Three Fiber with Three.js for animated backgrounds
- **TypeScript**: Full type safety throughout the application
- **UI Components**: Radix UI primitives with custom styling

### Backend
- **API**: RESTful API (Python-based, see backend directory)
- **Analysis Engine**: Advanced ML and statistical analysis tools

## Project Structure

```
.root
├── src
│   ├── backend
│   │   ├── ai                 # Analysis Engine
│   │   └── analyzer           # Analysis output generator
│   │
│   └── frontend               # Next.js frontend application
│       ├── app                # Next.js app router
│       ├── components         # Reusable UI components
│       ├── lib                # Utility functions
│       ├── node_modules       # Modules used in development
│       └── public             # Static assets
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- Python 3.8+ (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <cloned-repository>
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   docker build -t dal-backend .
   ```

4. **Start the development servers**

   Frontend:
   ```bash
   cd frontend
   npm run dev
   # or
   yarn dev
   ```

   Backend:
   ```bash
   docker run -p 8000:8000 dal-backend
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Environment Variables

Create a `.env` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Usage

1. **Upload Dataset**: Click "Open Upload Flow" or drag & drop files
2. **View Analysis**: Navigate through different tabs:
   - **Dataset**: File preview and basic metrics
   - **Charts**: Visual analysis and distributions
   - **Insights**: AI-generated analysis and recommendations
   - **Biasing**: Bias detection and risk assessment
   - **Suggestions**: Automated cleaning recommendations
   - **Activity**: Analysis history and logs

## API Endpoints

- `POST /analyze` - Upload and analyze dataset
- `POST /apply_suggestions` - Apply cleaning recommendations

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Component Structure

- `app/page.tsx` - Main application page
- `components/ui/` - Reusable UI components
- `lib/` - Utility functions and configurations
- `components/hero-webgl-background.tsx` - 3D animated background

