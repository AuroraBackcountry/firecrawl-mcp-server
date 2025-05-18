#!/usr/bin/env node

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import FirecrawlApp from '@mendable/firecrawl-js';

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
  console.error('❌ FIRECRAWL_API_KEY is missing in environment variables');
  process.exit(1);
}

const firecrawl = new FirecrawlApp({
  apiKey: FIRECRAWL_API_KEY,
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Main MCP /context endpoint
app.post('/context', async (req: Request, res: Response) => {
  try {
    const { references = [], vars = {} } = req.body.input || {};

    const ref = references.find((r: any) => r.content?.urls?.length > 0);
    if (!ref) {
      return res.status(400).json({ error: 'No valid reference with URLs provided' });
    }

    const url = ref.content.urls[0];

    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
    });

    const content = result.markdown || result.html || result.rawHtml || 'No content returned';

    return res.status(200).json({
      references: [
        {
          name: ref.name || 'firecrawl_result',
          content,
        },
      ],
      vars,
    });
  } catch (error) {
    console.error('❌ Error handling /context:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Firecrawl MCP server running at http://localhost:${port}/context`);
});
