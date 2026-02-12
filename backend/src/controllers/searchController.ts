import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { searchService } from '../services/SearchService.js';

/**
 * Search for products
 * GET /api/search?q=query&page=1&limit=20
 */
export const searchProducts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { q, page, limit } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 20;

    // Validate pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGE',
          message: 'Page must be a positive integer',
        },
      });
      return;
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100',
        },
      });
      return;
    }

    const result = await searchService.search(q, pageNum, limitNum);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to search products',
      },
    });
  }
};

/**
 * Get autocomplete suggestions
 * GET /api/search/suggestions?q=query&limit=10
 */
export const getSuggestions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    const limitNum = limit ? parseInt(limit as string) : 10;

    // Validate limit parameter
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 50',
        },
      });
      return;
    }

    const suggestions = await searchService.getSuggestions(q, limitNum);

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUGGESTIONS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get suggestions',
      },
    });
  }
};
