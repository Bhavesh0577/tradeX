// filepath: /c:/Users/bhave/fintola/src/pages/api/finance.js
import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  try {
    // Get the symbol from the query parameters, default to BTC-USD if not provided
    const { symbol = 'BTC-USD' } = req.query;

    // Get current time
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

    // Convert to UNIX timestamps in seconds
    const period1 = Math.floor(oneYearAgo / 1000); // Start date
    const period2 = Math.floor(now / 1000); // Current date

    const chartData = await yahooFinance.chart(symbol, { period1, period2, interval: '1h' });

    res.status(200).json(chartData);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
}
