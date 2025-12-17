import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import re
import os
from dotenv import load_dotenv

from scraperapi_sdk import ScraperAPIClient
from bs4 import BeautifulSoup

load_dotenv()

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "")


async def scrape_walmart_product(item_id: str, max_reviews: int = 50, headless: bool = False) -> Dict[str, Any]:
    """
    Scrape Walmart Canada product using ScraperAPI (simple, no render).
    Gets ~7-10 reviews per product (first page only).
    """
    print(f"\n🛒 Starting scrape for: {item_id}")
    
    if not SCRAPER_API_KEY:
        raise ValueError("SCRAPER_API_KEY is required")
    
    client = ScraperAPIClient(SCRAPER_API_KEY)
    
    # Use SKU/Item ID directly
    product_url = f"https://www.walmart.ca/en/ip/{item_id}"
    
    result = {
        "item_id": item_id,
        "walmart_item_number": item_id,
        "product_url": product_url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "product_title": None,
        "average_rating": None,
        "total_ratings": None,
        "total_reviews": None,
        "rating_breakdown": {},
        "reviews": [],
        "best_reviews": [],
        "worst_reviews": []
    }
    
    try:
        print("  🔑 Connecting to ScraperAPI...")
        
        # Get product page
        print(f"  📄 Fetching: {product_url}")
        html = client.get(product_url)
        
        if not html or len(html) < 100:
            raise RuntimeError("Failed to fetch page")
        
        print(f"  ✅ Page fetched! ({len(html)} chars)")
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract title
        print("  🔍 Extracting product info...")
        title_el = soup.find('h1')
        if title_el:
            result["product_title"] = title_el.get_text(strip=True)
            print(f"  ✓ Title: {result['product_title'][:60]}...")
        
        # Extract rating from JSON-LD
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get('@type') == 'Product':
                    agg = data.get('aggregateRating', {})
                    if agg.get('ratingValue'):
                        result["average_rating"] = float(agg['ratingValue'])
                        print(f"  ✓ Rating: {result['average_rating']}")
                    if agg.get('reviewCount'):
                        result["total_ratings"] = int(agg['reviewCount'])
                        result["total_reviews"] = int(agg['reviewCount'])
                        print(f"  ✓ Total ratings: {result['total_ratings']}")
                    
                    # Extract reviews from JSON-LD if available
                    if data.get('review'):
                        reviews = data['review']
                        if not isinstance(reviews, list):
                            reviews = [reviews]
                        
                        print(f"  📝 Found {len(reviews)} reviews in JSON-LD")
                        
                        for rev in reviews[:max_reviews]:
                            try:
                                review_data = {
                                    "review_id": None,
                                    "author_name": "Anonymous",
                                    "rating": None,
                                    "title": "",
                                    "body": "",
                                    "created_at": None,
                                    "verified_purchase": False,
                                    "location": None,
                                    "helpful_count": 0,
                                    "not_helpful_count": 0,
                                    "images": [],
                                }
                                
                                # Author
                                if rev.get('author'):
                                    author = rev['author']
                                    if isinstance(author, dict):
                                        review_data["author_name"] = author.get('name', 'Anonymous')
                                    else:
                                        review_data["author_name"] = str(author)
                                
                                # Rating - ensure it's between 1-5
                                rating_obj = rev.get('reviewRating', {})
                                if isinstance(rating_obj, dict) and rating_obj.get('ratingValue'):
                                    rating_val = float(rating_obj['ratingValue'])
                                    # Walmart sometimes stores as 1-5, sometimes as 0-100
                                    if rating_val > 5:
                                        rating_val = rating_val / 20  # Convert 0-100 to 0-5
                                    review_data["rating"] = int(round(rating_val))
                                    
                                    # Debug first few
                                    if len(result["reviews"]) < 3:
                                        print(f"    Debug: Rating {rating_val} → {review_data['rating']} stars")
                                
                                # Title and body
                                review_data["title"] = rev.get('name', '') or rev.get('headline', '')
                                review_data["body"] = rev.get('reviewBody', '') or rev.get('description', '')
                                review_data["created_at"] = rev.get('datePublished')
                                
                                if review_data["body"] or review_data["rating"]:
                                    result["reviews"].append(review_data)
                            except:
                                continue
                    
                    break
            except:
                continue
        
        # If no reviews in JSON-LD, try to find in HTML
        if not result["reviews"]:
            print("  🔍 Looking for reviews in HTML...")
            
            # Try different selectors
            review_elements = (
                soup.find_all('div', {'data-testid': re.compile(r'review', re.I)}) or
                soup.find_all('div', class_=re.compile(r'review', re.I)) or
                soup.find_all('section', class_=re.compile(r'review', re.I))
            )
            
            print(f"  📝 Found {len(review_elements)} review elements in HTML")
            
            for idx, rev_el in enumerate(review_elements[:max_reviews]):
                try:
                    review_data = {
                        "review_id": None,
                        "author_name": "Anonymous",
                        "rating": None,
                        "title": "",
                        "body": "",
                        "created_at": None,
                        "verified_purchase": False,
                        "location": None,
                        "helpful_count": 0,
                        "not_helpful_count": 0,
                        "images": [],
                    }
                    
                    # Try to extract rating
                    rating_text = rev_el.get_text()
                    rating_match = re.search(r'(\d+)\s*(?:star|out of)', rating_text, re.I)
                    if rating_match:
                        review_data["rating"] = int(rating_match.group(1))
                    
                    # Title
                    title_el = rev_el.find(['h3', 'h4', 'h5'])
                    if title_el:
                        review_data["title"] = title_el.get_text(strip=True)
                    
                    # Body
                    body_el = rev_el.find('p')
                    if body_el:
                        review_data["body"] = body_el.get_text(strip=True)
                    
                    if review_data["body"] or review_data["title"]:
                        result["reviews"].append(review_data)
                except:
                    continue
        
        print(f"  ✓ Extracted {len(result['reviews'])} reviews")
        
        # Categorize best and worst  
        if result["reviews"] and len(result["reviews"]) >= 2:
            print("  🔍 Categorizing reviews...")
            
            rated = [r for r in result["reviews"] if r.get("rating") and r["rating"] > 0]
            
            if rated:
                # Best: Only 4-5 stars
                best = [r for r in rated if r["rating"] >= 4]
                result["best_reviews"] = best[:5]
                
                # Worst: Only 1-3 stars
                worst = [r for r in rated if r["rating"] <= 3]
                result["worst_reviews"] = worst[:5]
                
                print(f"  ✓ {len(result['best_reviews'])} best (4-5★), {len(result['worst_reviews'])} worst (1-3★)")

        
        if not result["reviews"]:
            print("  ⚠️  No reviews found - product may not have reviews yet")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    print(f"✅ Completed! Reviews: {len(result['reviews'])}\n")
    return result