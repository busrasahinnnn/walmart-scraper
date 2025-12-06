import { useState } from "react";

type Review = {
  review_id: string | null;
  author_name: string;
  rating: number | null;
  title: string;
  body: string;
  created_at: string | null;
  verified_purchase: boolean;
  location: string | null;
  helpful_count: number;
  not_helpful_count: number;
  images: string[];
};

type ProductResult = {
  item_id: string;
  product_url: string | null;
  scraped_at: string;
  product_title: string | null;
  average_rating: number | null;
  total_ratings: number | null;
  total_reviews: number | null;
  rating_breakdown: Record<string, number>;
  reviews: Review[];
};

type ErrorResult = {
  item_id: string;
  error: string;
};

type ApiResponse = {
  results?: ProductResult[];
  errors?: ErrorResult[];
};

export default function Home() {
  const [itemIdsText, setItemIdsText] = useState("");
  const [maxReviews, setMaxReviews] = useState(50);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);

    const ids = itemIdsText
      .split(/[\s,\n]+/)
      .map((i) => i.trim())
      .filter(Boolean);

    if (!ids.length) {
      setError("Please enter at least one item ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: ids,
          max_reviews_per_item: Number(maxReviews),
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Scrape error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `walmart_reviews_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return "N/A";
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <span className="stars">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < fullStars ? "star-filled" : i === fullStars && hasHalf ? "star-half" : "star-empty"}>
            ★
          </span>
        ))}
      </span>
    );
  };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Outfit', sans-serif;
          color: #1a1a2e;
          position: relative;
          overflow-x: hidden;
        }

        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          position: relative;
          z-index: 1;
        }

        .header {
          text-align: center;
          margin-bottom: 50px;
          animation: fadeInDown 0.8s ease-out;
        }

        .title {
          font-size: 4rem;
          font-weight: 800;
          margin: 0 0 16px;
          background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          letter-spacing: -2px;
        }

        .subtitle {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 400;
          margin: 0;
        }

        .card {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }

        .form-group {
          margin-bottom: 28px;
        }

        .label {
          display: block;
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 10px;
          color: #2d3748;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .textarea {
          width: 100%;
          padding: 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.95rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          resize: vertical;
          transition: all 0.3s ease;
          background: #f7fafc;
          box-sizing: border-box;
        }

        .textarea:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .input {
          width: 100%;
          max-width: 200px;
          padding: 12px 16px;
          font-size: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.3s ease;
          background: #f7fafc;
          box-sizing: border-box;
        }

        .input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .button-group {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 32px;
        }

        .button {
          padding: 16px 32px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Outfit', sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .button:hover::before {
          width: 300px;
          height: 300px;
        }

        .button span {
          position: relative;
          z-index: 1;
        }

        .button-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }

        .button-secondary {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
        }

        .button-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(245, 87, 108, 0.5);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .error-box {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-top: 24px;
          animation: shake 0.5s ease-in-out;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }

        .error-box strong {
          font-weight: 700;
        }

        .loading-box {
          text-align: center;
          padding: 60px 20px;
          margin-top: 32px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 24px;
        }

        .loading-box p {
          font-size: 1.1rem;
          color: #4a5568;
          margin: 0;
        }

        .results {
          margin-top: 40px;
          animation: fadeIn 0.6s ease-out;
        }

        .results-header {
          background: white;
          padding: 24px;
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .results-header h2 {
          margin: 0 0 8px;
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
        }

        .product-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .product-card:hover {
          border-color: #667eea;
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.2);
          transform: translateY(-2px);
        }

        .product-card h3 {
          margin: 0 0 20px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
        }

        .product-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
        }

        .stars {
          display: inline-flex;
          gap: 2px;
          font-size: 1.2rem;
        }

        .star-filled {
          color: #f59e0b;
        }

        .star-half {
          color: #f59e0b;
          opacity: 0.5;
        }

        .star-empty {
          color: #e2e8f0;
        }

        .reviews-section {
          margin-top: 24px;
        }

        .reviews-toggle {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 24px;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .reviews-toggle:hover {
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          transform: translateY(-2px);
        }

        .reviews-list {
          margin-top: 16px;
          padding: 20px;
          background: #f7fafc;
          border-radius: 12px;
        }

        .review-item {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border-left: 4px solid #667eea;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .review-item:last-child {
          margin-bottom: 0;
        }

        .review-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .review-author {
          font-weight: 600;
          color: #2d3748;
        }

        .verified-badge {
          background: #48bb78;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .review-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 8px;
        }

        .review-body {
          color: #4a5568;
          line-height: 1.7;
          margin: 0 0 12px;
        }

        .review-date {
          font-size: 0.9rem;
          color: #a0aec0;
          margin: 0;
        }

        .link {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s ease;
        }

        .link:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @media (max-width: 768px) {
          .title {
            font-size: 2.5rem;
          }
          .card {
            padding: 24px;
          }
          .button-group {
            flex-direction: column;
          }
          .button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="container">
        <main className="main">
          <div className="header">
            <h1 className="title">🛒 Walmart Scraper</h1>
            <p className="subtitle">Extract product reviews instantly</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label" htmlFor="itemIds">
                  Walmart Item IDs
                </label>
                <textarea
                  id="itemIds"
                  rows={6}
                  className="textarea"
                  value={itemIdsText}
                  onChange={(e) => setItemIdsText(e.target.value)}
                  placeholder="Enter item IDs (one per line or comma separated)&#10;Example: 5337824985"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="maxReviews">
                  Max Reviews Per Item
                </label>
                <input
                  id="maxReviews"
                  type="number"
                  className="input"
                  value={maxReviews}
                  min={1}
                  max={500}
                  onChange={(e) => setMaxReviews(Number(e.target.value))}
                  disabled={loading}
                />
              </div>

              <div className="button-group">
                <button type="submit" className="button button-primary" disabled={loading}>
                  <span>{loading ? "⏳ Scraping..." : "🚀 Start Scrape"}</span>
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleDownload}
                  disabled={!data || loading}
                >
                  <span>📥 Download JSON</span>
                </button>
              </div>
            </form>

            {error && (
              <div className="error-box">
                <strong>❌ Error:</strong> {error}
              </div>
            )}
          </div>

          {loading && (
            <div className="loading-box">
              <div className="spinner"></div>
              <p>Scraping reviews... This may take a moment.</p>
            </div>
          )}

          {data && !loading && (
            <div className="results">
              {data.results && data.results.length > 0 && (
                <>
                  <div className="results-header">
                    <h2>✅ Successfully Scraped {data.results.length} {data.results.length === 1 ? 'Item' : 'Items'}</h2>
                  </div>
                  
                  {data.results.map((product, idx) => (
                    <div key={idx} className="product-card">
                      <h3>{product.product_title || `Item ${product.item_id}`}</h3>
                      
                      <div className="product-meta">
                        <div className="meta-item">
                          <span className="meta-label">Item ID</span>
                          <span className="meta-value">{product.item_id}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Rating</span>
                          <span className="meta-value">
                            {renderStars(product.average_rating)}
                            {product.average_rating && ` (${product.average_rating.toFixed(1)}/5)`}
                          </span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Total Ratings</span>
                          <span className="meta-value">{product.total_ratings?.toLocaleString() || "Unknown"}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Scraped</span>
                          <span className="meta-value">{product.reviews.length} reviews</span>
                        </div>
                      </div>

                      {product.product_url && (
                        <p>
                          <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="link">
                            View on Walmart →
                          </a>
                        </p>
                      )}

                      {product.reviews.length > 0 && (
                        <div className="reviews-section">
                          <details>
                            <summary className="reviews-toggle">
                              <span>📝 View {product.reviews.length} Reviews</span>
                              <span>▼</span>
                            </summary>
                            <div className="reviews-list">
                              {product.reviews.map((review, ridx) => (
                                <div key={ridx} className="review-item">
                                  <div className="review-header">
                                    {renderStars(review.rating)}
                                    <span className="review-author">{review.author_name}</span>
                                    {review.verified_purchase && (
                                      <span className="verified-badge">✓ Verified</span>
                                    )}
                                  </div>
                                  {review.title && (
                                    <h4 className="review-title">{review.title}</h4>
                                  )}
                                  <p className="review-body">
                                    {review.body.substring(0, 250)}
                                    {review.body.length > 250 && "..."}
                                  </p>
                                  {review.created_at && (
                                    <p className="review-date">📅 {review.created_at}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {data.errors && data.errors.length > 0 && (
                <div className="error-box" style={{ marginTop: '24px' }}>
                  <h3 style={{ margin: '0 0 16px' }}>❌ Errors ({data.errors.length})</h3>
                  {data.errors.map((err, idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <strong>Item {err.item_id}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}