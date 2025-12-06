import asyncio
import os
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from scraper import scrape_walmart_product

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
MAX_CONCURRENT_SCRAPES = int(os.getenv("MAX_CONCURRENT_SCRAPES", 3))
HEADLESS = os.getenv("HEADLESS", "true").lower() in ("1", "true", "yes")

app = FastAPI(
    title="Walmart Review Scraper API",
    description="API for scraping Walmart product reviews",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev; restrict in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    """Request model for scraping endpoint."""
    item_ids: List[str] = Field(..., description="List of Walmart item IDs to scrape")
    max_reviews_per_item: int = Field(default=50, ge=1, le=500, description="Maximum reviews to scrape per item")


class ScrapeResponse(BaseModel):
    """Response model for scraping endpoint."""
    results: List[Dict[str, Any]]
    errors: List[Dict[str, str]]


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Walmart Review Scraper API",
        "version": "1.0.0",
        "endpoints": {
            "POST /scrape": "Scrape Walmart product reviews",
            "GET /health": "Health check"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "headless": HEADLESS}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_endpoint(req: ScrapeRequest):
    """
    Scrape Walmart product reviews for given item IDs.
    
    Args:
        req: ScrapeRequest containing item_ids and max_reviews_per_item
    
    Returns:
        ScrapeResponse with results and errors
    """
    results = []
    errors = []

    # Create semaphore for concurrent scraping limit
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCRAPES)

    async def _run_one(item_id: str):
        """Run scraper for a single item."""
        async with semaphore:
            try:
                print(f"🚀 Starting scrape for item: {item_id}")
                out = await scrape_walmart_product(
                    item_id.strip(),
                    max_reviews=req.max_reviews_per_item,
                    headless=HEADLESS
                )
                results.append(out)
                print(f"✅ Successfully scraped item: {item_id}")
            except Exception as e:
                error_msg = str(e)
                print(f"❌ Error scraping item {item_id}: {error_msg}")
                errors.append({
                    "item_id": item_id,
                    "error": error_msg
                })

    # Filter and validate item IDs
    valid_ids = [i.strip() for i in req.item_ids if i.strip()]
    
    if not valid_ids:
        raise HTTPException(status_code=400, detail="No valid item_ids provided")

    # Create tasks for all items
    tasks = [asyncio.create_task(_run_one(item_id)) for item_id in valid_ids]
    
    # Wait for all tasks to complete
    await asyncio.gather(*tasks, return_exceptions=True)
    
    return {"results": results, "errors": errors}


if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting Walmart Review Scraper API on {HOST}:{PORT}")
    print(f"📝 Headless mode: {HEADLESS}")
    print(f"🔄 Max concurrent scrapes: {MAX_CONCURRENT_SCRAPES}")
    uvicorn.run(app, host=HOST, port=PORT)