This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your environment variables:

1. Copy the `.env.example` file to a new file named `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your actual API keys and secrets.

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Trading Models and Features

This project includes advanced trading capabilities:

### 1. Trading Ensemble Model
- Located in `src/lib/ml/tradingModel.ts`
- Combines multiple ML models (Random Forest, Gradient Boosting, Neural Network, etc.) for more accurate predictions
- Weighs models based on historical performance and generates trading signals

### 2. Backtesting Module
- Located in `src/lib/trading/backtesting.ts`
- Validates trading strategies against historical data
- Provides comprehensive performance metrics (returns, drawdowns, Sharpe ratio, etc.)
- Simulates real-world trading conditions with slippage and commissions

### 3. Sentiment Analysis Module
- Located in `src/lib/ml/sentimentAnalysis.ts`
- Analyzes news articles and social media posts for market sentiment
- Calculates bullish/bearish scores, fear/greed indices, and entity-based sentiment
- Generates contrarian signals during extreme market sentiment

### 4. Combined Trading Model
- Located in `src/lib/ml/combinedTradingModel.ts`
- Integrates technical and sentiment analysis for improved performance
- Weighted approach to combine different signal sources
- Supports backtesting and performance evaluation

### 5. Trading Visualization
- Located in `src/lib/visualization/tradingVisualizer.ts`
- Creates data structures for visualizing price charts, indicators, and performance
- Supports equity curves, drawdown analysis, and trade statistics
- Enables symbol comparison and performance analysis by time period

### Demo
Check out the demo in `src/examples/combinedModelDemo.ts` for a complete example of how to use all these components together.

## Environment Variables and Security

This project uses environment variables to store sensitive information like API keys. To keep your keys secure:

1. **Never commit `.env` files to Git**: The `.gitignore` file is set up to exclude all `.env*` files except for `.env.example`.
2. **Use `.env.example` as a template**: This file shows what environment variables are needed without exposing actual values.
3. **For local development**: Create a `.env.local` file with your actual keys.
4. **For production**: Set environment variables in your hosting platform (e.g., Vercel).

Required environment variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
- `CLERK_SECRET_KEY`: Your Clerk secret key
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: URL for sign-in page
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: URL for sign-up page
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: Redirect URL after sign-in
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: Redirect URL after sign-up

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
