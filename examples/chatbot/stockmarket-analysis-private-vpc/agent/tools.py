"""Stock market analysis tools for the conversational agent."""

from typing import Any

import feedparser
import yfinance as yf


def get_stock_price(symbol: str) -> dict[str, Any]:
    """Get the current/latest stock price and key metrics for a given ticker symbol.

    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL', 'GOOGL', 'MSFT').

    Returns:
        Dictionary with current price data including price, change, volume, and key metrics.
    """
    ticker = yf.Ticker(symbol)
    info = ticker.info

    fast_info = ticker.fast_info
    current_price = fast_info.get("lastPrice", info.get("currentPrice", "N/A"))
    previous_close = fast_info.get("previousClose", info.get("previousClose", "N/A"))

    if isinstance(current_price, (int, float)) and isinstance(previous_close, (int, float)):
        change = round(current_price - previous_close, 2)
        change_pct = round((change / previous_close) * 100, 2)
    else:
        change = "N/A"
        change_pct = "N/A"

    return {
        "symbol": symbol.upper(),
        "company_name": info.get("shortName", "N/A"),
        "current_price": current_price,
        "previous_close": previous_close,
        "change": change,
        "change_percent": change_pct,
        "day_high": fast_info.get("dayHigh", "N/A"),
        "day_low": fast_info.get("dayLow", "N/A"),
        "volume": fast_info.get("lastVolume", info.get("volume", "N/A")),
        "market_cap": info.get("marketCap", "N/A"),
        "pe_ratio": info.get("trailingPE", "N/A"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh", "N/A"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow", "N/A"),
        "currency": info.get("currency", "USD"),
    }


def get_stock_history(symbol: str, period: str = "1mo", interval: str = "1d") -> dict[str, Any]:
    """Get historical price data for a stock.

    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL').
        period: Time period - valid values: '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd', 'max'.
        interval: Data interval - valid values: '1m', '5m', '15m', '1h', '1d', '1wk', '1mo'.

    Returns:
        Dictionary with historical OHLCV data.
    """
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period=period, interval=interval)

    if hist.empty:
        return {"symbol": symbol.upper(), "error": "No historical data found", "data": []}

    records = []
    for date, row in hist.tail(30).iterrows():
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(row["Open"], 2),
            "high": round(row["High"], 2),
            "low": round(row["Low"], 2),
            "close": round(row["Close"], 2),
            "volume": int(row["Volume"]),
        })

    latest = records[-1]["close"] if records else 0
    earliest = records[0]["close"] if records else 0
    period_change = round(latest - earliest, 2) if earliest else 0
    period_change_pct = round((period_change / earliest) * 100, 2) if earliest else 0

    return {
        "symbol": symbol.upper(),
        "period": period,
        "interval": interval,
        "data_points": len(records),
        "period_change": period_change,
        "period_change_percent": period_change_pct,
        "data": records,
    }


def get_company_info(symbol: str) -> dict[str, Any]:
    """Get detailed company information and fundamentals.

    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL').

    Returns:
        Dictionary with company details, financial metrics, and analyst recommendations.
    """
    ticker = yf.Ticker(symbol)
    info = ticker.info

    return {
        "symbol": symbol.upper(),
        "company_name": info.get("shortName", "N/A"),
        "sector": info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "description": info.get("longBusinessSummary", "N/A"),
        "website": info.get("website", "N/A"),
        "employees": info.get("fullTimeEmployees", "N/A"),
        "country": info.get("country", "N/A"),
        "financials": {
            "market_cap": info.get("marketCap", "N/A"),
            "enterprise_value": info.get("enterpriseValue", "N/A"),
            "revenue": info.get("totalRevenue", "N/A"),
            "gross_profit": info.get("grossProfits", "N/A"),
            "ebitda": info.get("ebitda", "N/A"),
            "net_income": info.get("netIncomeToCommon", "N/A"),
            "earnings_per_share": info.get("trailingEps", "N/A"),
            "pe_ratio": info.get("trailingPE", "N/A"),
            "forward_pe": info.get("forwardPE", "N/A"),
            "peg_ratio": info.get("pegRatio", "N/A"),
            "price_to_book": info.get("priceToBook", "N/A"),
            "dividend_yield": info.get("dividendYield", "N/A"),
            "profit_margin": info.get("profitMargins", "N/A"),
            "return_on_equity": info.get("returnOnEquity", "N/A"),
            "debt_to_equity": info.get("debtToEquity", "N/A"),
        },
        "analyst_target_price": info.get("targetMeanPrice", "N/A"),
        "recommendation": info.get("recommendationKey", "N/A"),
    }


def analyze_stock(symbol: str) -> dict[str, Any]:
    """Perform basic technical analysis on a stock including moving averages and RSI.

    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL').

    Returns:
        Dictionary with technical indicators and a summary signal.
    """
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="6mo", interval="1d")

    if hist.empty or len(hist) < 50:
        return {"symbol": symbol.upper(), "error": "Insufficient data for analysis"}

    close = hist["Close"]

    sma_20 = close.rolling(window=20).mean().iloc[-1]
    sma_50 = close.rolling(window=50).mean().iloc[-1]
    ema_12 = close.ewm(span=12).mean().iloc[-1]
    ema_26 = close.ewm(span=26).mean().iloc[-1]

    # RSI (14-day)
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(window=14).mean().iloc[-1]
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean().iloc[-1]
    rs = gain / loss if loss != 0 else 0
    rsi = 100 - (100 / (1 + rs))

    # MACD
    macd = ema_12 - ema_26
    signal_line = close.ewm(span=9).mean().iloc[-1] - close.ewm(span=26).mean().iloc[-1]

    # Bollinger Bands (20-day)
    bb_middle = sma_20
    bb_std = close.rolling(window=20).std().iloc[-1]
    bb_upper = bb_middle + (2 * bb_std)
    bb_lower = bb_middle - (2 * bb_std)

    current_price = close.iloc[-1]

    # Generate signals
    signals = []
    if current_price > sma_50:
        signals.append("Price above 50-day SMA (bullish)")
    else:
        signals.append("Price below 50-day SMA (bearish)")

    if sma_20 > sma_50:
        signals.append("20-day SMA above 50-day SMA (golden cross / bullish)")
    else:
        signals.append("20-day SMA below 50-day SMA (death cross / bearish)")

    if rsi > 70:
        signals.append(f"RSI at {rsi:.1f} - Overbought")
    elif rsi < 30:
        signals.append(f"RSI at {rsi:.1f} - Oversold")
    else:
        signals.append(f"RSI at {rsi:.1f} - Neutral")

    if macd > signal_line:
        signals.append("MACD above signal line (bullish)")
    else:
        signals.append("MACD below signal line (bearish)")

    return {
        "symbol": symbol.upper(),
        "current_price": round(current_price, 2),
        "indicators": {
            "sma_20": round(sma_20, 2),
            "sma_50": round(sma_50, 2),
            "ema_12": round(ema_12, 2),
            "ema_26": round(ema_26, 2),
            "rsi_14": round(rsi, 2),
            "macd": round(macd, 2),
            "bollinger_upper": round(bb_upper, 2),
            "bollinger_middle": round(bb_middle, 2),
            "bollinger_lower": round(bb_lower, 2),
        },
        "signals": signals,
    }


def get_market_news(query: str = "stock market") -> dict[str, Any]:
    """Get latest market news from RSS feeds.

    Args:
        query: Search topic for news. Use stock symbol or company name for targeted results.
               Examples: 'AAPL', 'Tesla', 'stock market', 'S&P 500'.

    Returns:
        Dictionary with a list of recent news articles.
    """
    feeds = [
        f"https://news.google.com/rss/search?q={query}+stock+market&hl=en-US&gl=US&ceid=US:en",
        "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US",
    ]

    articles = []
    for feed_url in feeds:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:5]:
                published = ""
                if hasattr(entry, "published"):
                    published = entry.published
                elif hasattr(entry, "updated"):
                    published = entry.updated

                articles.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": published,
                    "source": entry.get("source", {}).get("title", feed.feed.get("title", "Unknown")),
                    "summary": entry.get("summary", "")[:200],
                })
        except Exception:
            continue

    # Deduplicate by title
    seen = set()
    unique_articles = []
    for article in articles:
        if article["title"] not in seen:
            seen.add(article["title"])
            unique_articles.append(article)

    return {
        "query": query,
        "article_count": len(unique_articles),
        "articles": unique_articles[:10],
    }


def get_market_overview() -> dict[str, Any]:
    """Get an overview of major market indices and their current status.

    Returns:
        Dictionary with major index prices and changes.
    """
    indices = {
        "S&P 500": "^GSPC",
        "Dow Jones": "^DJI",
        "NASDAQ": "^IXIC",
        "Russell 2000": "^RUT",
        "VIX": "^VIX",
    }

    overview = []
    for name, symbol in indices.items():
        try:
            ticker = yf.Ticker(symbol)
            fast_info = ticker.fast_info
            price = fast_info.get("lastPrice", 0)
            prev_close = fast_info.get("previousClose", 0)
            change = round(price - prev_close, 2) if price and prev_close else 0
            change_pct = round((change / prev_close) * 100, 2) if prev_close else 0

            overview.append({
                "name": name,
                "symbol": symbol,
                "price": round(price, 2),
                "change": change,
                "change_percent": change_pct,
            })
        except Exception:
            overview.append({"name": name, "symbol": symbol, "error": "Data unavailable"})

    return {"indices": overview}
