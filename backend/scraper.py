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
    Scrape Walmart Canada product using ScraperAPI.
    """
    print(f"\n🛒 Starting scrape for item {item_id}")
    
    if not SCRAPER_API_KEY:
        raise ValueError("SCRAPER_API_KEY is required")
    
    url = f"https://www.walmart.ca/en/ip/{item_id}"
    
    result = {
        "item_id": item_id,
        "product_url": url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "product_title": None,
        "average_rating": None,
        "total_ratings": None,  # Total number of ratings
        "total_reviews": None,  # Total number of written reviews
        "rating_breakdown": {},
        "reviews": []
    }
    
    try:
        print("  🔑 Connecting to ScraperAPI...")
        client = ScraperAPIClient(SCRAPER_API_KEY)
        
        print(f"  📄 Fetching: {url}")
        html_content = client.get(url)
        
        if not html_content:
            raise RuntimeError("Failed to fetch page - empty response")
        
        print(f"  ✅ Page fetched successfully!")
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract title
        print("  🔍 Extracting title...")
        title_el = soup.find('h1')
        if title_el:
            result["product_title"] = title_el.get_text(strip=True)
            print(f"  ✓ Title: {result['product_title'][:60]}...")
        
        # Look for JSON-LD Product schema
        print("  🔍 Looking for JSON-LD data...")
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                
                products = []
                if isinstance(data, dict):
                    if data.get('@type') == 'Product':
                        products = [data]
                elif isinstance(data, list):
                    products = [item for item in data if isinstance(item, dict) and item.get('@type') == 'Product']
                
                for product in products:
                    agg = product.get('aggregateRating', {})
                    
                    if agg.get('ratingValue'):
                        result["average_rating"] = float(agg['ratingValue'])
                        print(f"  ✓ Rating: {result['average_rating']}")
                    
                    # Store but don't use this yet
                    if agg.get('reviewCount'):
                        json_ld_count = int(agg['reviewCount'])
                        result["total_ratings"] = json_ld_count  # This is total ratings
                        print(f"  📊 JSON-LD reviewCount (total ratings): {json_ld_count}")
                    
                    if agg:
                        print(f"  📊 aggregateRating data: {agg}")
                    
                    break
                
                if result["average_rating"]:
                    break
            except:
                continue
        
        # CRITICAL: Search HTML for ALL occurrences of "reviews" to find the right one
        print("  🔍 Searching ALL occurrences of 'reviews' and 'ratings' in HTML...")
        
        # Find all matches
        all_matches = re.findall(r'([\d,]+)\s+(reviews?|ratings?)', html_content, re.I)
        
        if all_matches:
            print(f"  📝 Found {len(all_matches)} number + 'review/rating' patterns:")
            for num, word in all_matches[:10]:  # Show first 10
                print(f"     - {num} {word}")
            
            # Separate reviews from ratings
            review_matches = [(num, word) for num, word in all_matches if 'review' in word.lower()]
            rating_matches = [(num, word) for num, word in all_matches if 'rating' in word.lower()]
            
            # Get total reviews (written reviews)
            if review_matches:
                first_review_count = review_matches[0][0].replace(',', '')
                count = int(first_review_count)
                result["total_reviews"] = count
                # If we don't have total_ratings yet, use this as fallback
                if not result["total_ratings"]:
                    result["total_ratings"] = count
                print(f"  ✓ Total reviews (written): {result['total_reviews']}")
            
            # Get total ratings if not already set
            if not result["total_ratings"] and rating_matches:
                first_rating_count = rating_matches[0][0].replace(',', '')
                result["total_ratings"] = int(first_rating_count)
                print(f"  ✓ Total ratings: {result['total_ratings']}")
        
        # Search for rating if still not found
        if not result["average_rating"]:
            print("  🔍 Searching for rating in HTML...")
            
            # Try multiple patterns
            rating_patterns = [
                r'(\d+\.\d+)\s*out of\s*5',
                r'"ratingValue"\s*:\s*"?(\d+\.?\d*)"?',
                r'"averageRating"\s*:\s*"?(\d+\.?\d*)"?',
                r'rating["\s:]+(\d+\.\d+)',
            ]
            
            for pattern in rating_patterns:
                match = re.search(pattern, html_content, re.I)
                if match:
                    try:
                        rating = float(match.group(1))
                        if 0 <= rating <= 5:
                            result["average_rating"] = rating
                            print(f"  ✓ Rating from pattern: {result['average_rating']}")
                            break
                    except:
                        continue
        
        # Extract actual reviews
        print("  🔍 Looking for individual reviews...")
        
        # Try to find reviews in JSON-LD Review schema
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                
                reviews_found = []
                
                if isinstance(data, dict):
                    if data.get('@type') == 'Review':
                        reviews_found = [data]
                    elif data.get('review'):
                        reviews = data['review']
                        if isinstance(reviews, list):
                            reviews_found = reviews
                        else:
                            reviews_found = [reviews]
                elif isinstance(data, list):
                    reviews_found = [item for item in data if isinstance(item, dict) and item.get('@type') == 'Review']
                
                if reviews_found:
                    print(f"  ✓ Found {len(reviews_found)} reviews in JSON-LD")
                    
                    for review in reviews_found[:max_reviews]:
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
                            
                            if review.get('author'):
                                author = review['author']
                                if isinstance(author, dict):
                                    review_data["author_name"] = author.get('name', 'Anonymous')
                                else:
                                    review_data["author_name"] = str(author)
                            
                            rating_obj = review.get('reviewRating', {})
                            if isinstance(rating_obj, dict) and rating_obj.get('ratingValue'):
                                review_data["rating"] = int(float(rating_obj['ratingValue']))
                            
                            review_data["title"] = review.get('name', '') or review.get('headline', '')
                            review_data["body"] = review.get('reviewBody', '') or review.get('description', '')
                            review_data["created_at"] = review.get('datePublished')
                            
                            if review_data["body"] or review_data["rating"]:
                                result["reviews"].append(review_data)
                        except:
                            continue
                    
                    if result["reviews"]:
                        break
            except:
                continue
        
        if result["reviews"]:
            print(f"  ✓ Extracted {len(result['reviews'])} real reviews")
        else:
            print("  ⚠️  No review content found - reviews may be loaded via separate API")
        
        if not result["average_rating"]:
            print("  ⚠️  Could not extract rating")
        if not result["total_reviews"]:
            print("  ⚠️  Could not extract review count")
        
    except Exception as e:
        print(f"❌ Error during scraping: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    print(f"✅ Completed scrape for item {item_id}\n")
    return result