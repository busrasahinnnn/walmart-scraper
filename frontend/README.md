# 🛒 Walmart Review Scraper

A full-stack web scraping application that extracts customer reviews from Walmart product pages using Playwright, FastAPI, and Next.js.

## 📋 Project Overview

This project demonstrates:
- **Web Scraping**: Using Playwright (Python) to extract product reviews
- **Backend API**: FastAPI with async support and concurrent scraping
- **Frontend UI**: Modern Next.js (TypeScript) interface with TailwindCSS styling
- **Data Export**: Download scraped data as structured JSON files

## 🏗️ Architecture

```
┌─────────────┐      HTTP       ┌──────────────┐     Playwright    ┌─────────────┐
│   Next.js   │ ◄──────────────► │   FastAPI    │ ◄───────────────► │  Walmart    │
│  Frontend   │   POST /scrape   │   Backend    │   Web Scraping    │   Website   │
└─────────────┘                  └──────────────┘                   └─────────────┘
```

## 🛠️ Technologies

### Backend
- Python 3.10+
- FastAPI (async web framework)
- Playwright (browser automation)
- Pydantic (data validation)
- Uvicorn (ASGI server)

### Frontend
- Next.js 14 (React framework)
- TypeScript
- CSS Modules

## 📦 Installation

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Install Playwright browsers (CRITICAL STEP):
```bash
python -m playwright install
```

5. Create environment file:
```bash
cp .env.example .env
```

Edit `.env` if needed:
```env
HOST=0.0.0.0
PORT=8000
HEADLESS=true
MAX_CONCURRENT_SCRAPES=3
```

6. Run the backend server:
```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🚀 Usage

1. **Start both servers**:
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:3000`

2. **Enter Walmart Item IDs**:
   - Find product URLs like `https://www.walmart.com/ip/5337824985`
   - The item ID is the number at the end: `5337824985`
   - Enter one or more IDs (separated by newlines or commas)

3. **Configure scraping**:
   - Set max reviews per item (default: 50)
   - Click "Start Scrape"

4. **View results**:
   - Results appear with product details and reviews
   - Click "Download JSON" to save the data

## 📊 JSON Structure

Each product result follows this structure:

```json
{
  "item_id": "5337824985",
  "product_url": "https://www.walmart.com/ip/5337824985",
  "scraped_at": "2025-12-05T17:55:44.881270+00:00",
  "product_title": "Product Name",
  "average_rating": 4.3,
  "total_reviews": 128,
  "rating_breakdown": {
    "5": 80,
    "4": 25,
    "3": 10,
    "2": 7,
    "1": 6
  },
  "reviews": [
    {
      "review_id": null,
      "author_name": "John Doe",
      "rating": 5,
      "title": "Great product!",
      "body": "This product exceeded my expectations...",
      "created_at": "2025-10-01",
      "verified_purchase": true,
      "location": null,
      "helpful_count": 3,
      "not_helpful_count": 0,
      "images": []
    }
  ]
}
```

## 🔧 API Endpoints

### `POST /scrape`

Scrape reviews for one or more products.

**Request:**
```json
{
  "item_ids": ["5337824985", "987654321"],
  "max_reviews_per_item": 50
}
```

**Response:**
```json
{
  "results": [...],
  "errors": [
    {
      "item_id": "invalid_id",
      "error": "Error message"
    }
  ]
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "headless": true
}
```

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `playwright: command not found`
```bash
# Solution: Install Playwright browsers
python -m playwright install
```

**Problem**: Scraper returns empty reviews
- Walmart may have changed their HTML structure
- Check browser logs with `HEADLESS=false` in `.env`
- Update selectors in `backend/scraper.py`

**Problem**: Timeout errors
- Increase `page.set_default_timeout()` in `scraper.py`
- Check internet connection
- Verify item ID is valid

### Frontend Issues

**Problem**: CORS errors
- Ensure backend is running on port 8000
- Check CORS middleware is properly configured

**Problem**: Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🔒 Important Notes

### Legal & Ethical Considerations
- This project is for **educational purposes only**
- Review Walmart's Terms of Service before scraping
- Implement rate limiting and delays in production
- Respect `robots.txt` and website policies
- Consider using official APIs when available

### Rate Limiting
- Default: 3 concurrent scrapes (configurable via `MAX_CONCURRENT_SCRAPES`)
- Add delays between requests in production
- Monitor for IP blocking

## 🚀 Production Deployment

### Backend
```bash
# Use gunicorn with uvicorn workers
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Docker Support (Optional)

Create `Dockerfile` for backend:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🎯 Future Enhancements

- [ ] Add authentication and API keys
- [ ] Implement caching layer (Redis)
- [ ] Add database storage (PostgreSQL)
- [ ] Create admin dashboard
- [ ] Add scheduling for periodic scrapes
- [ ] Implement webhook notifications
- [ ] Add unit and integration tests
- [ ] Docker Compose setup
- [ ] CI/CD pipeline

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/)
- Powered by [FastAPI](https://fastapi.tiangolo.com/)
- Frontend with [Next.js](https://nextjs.org/)

---

**Note**: This project is for educational purposes. Always respect website terms of service and implement appropriate rate limiting.