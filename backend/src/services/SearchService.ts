import Product, { IProduct } from '../models/Product.js';

/**
 * Interface for search result with relevance score
 */
export interface SearchResult {
  product: IProduct;
  score: number;
}

/**
 * Interface for search query result
 */
export interface SearchQueryResult {
  products: IProduct[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

/**
 * Interface for autocomplete suggestion
 */
export interface Suggestion {
  text: string;
  category?: string;
}

/**
 * SearchService handles product search operations with fuzzy matching and ranking
 */
export class SearchService {
  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy matching to handle typos
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance between the strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }
    
    // Fill the dp table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }
    
    return dp[len1][len2];
  }

  /**
   * Check if query matches text with fuzzy matching
   * @param query - Search query
   * @param text - Text to match against
   * @param threshold - Maximum Levenshtein distance allowed (default: 2)
   * @returns True if match found within threshold
   */
  private fuzzyMatch(query: string, text: string, threshold: number = 2): boolean {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Exact substring match
    if (textLower.includes(queryLower)) {
      return true;
    }
    
    // Split text into words and check fuzzy match for each word
    const words = textLower.split(/\s+/);
    
    for (const word of words) {
      // Skip very short words
      if (word.length < 3) continue;
      
      // Check if query is similar to this word
      const distance = this.levenshteinDistance(queryLower, word);
      if (distance <= threshold) {
        return true;
      }
      
      // Also check if query is a fuzzy substring of the word
      if (word.length >= queryLower.length) {
        for (let i = 0; i <= word.length - queryLower.length; i++) {
          const substring = word.substring(i, i + queryLower.length);
          const distance = this.levenshteinDistance(queryLower, substring);
          if (distance <= threshold) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Calculate TF-IDF score for a search result
   * @param product - Product to score
   * @param query - Search query
   * @returns TF-IDF score
   */
  private calculateTFIDF(product: IProduct, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = product.title.en.toLowerCase();
    const descriptionLower = product.description.en.toLowerCase();
    
    // Term frequency in title and description
    const titleWords = titleLower.split(/\s+/);
    const descriptionWords = descriptionLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    
    let score = 0;
    
    for (const queryWord of queryWords) {
      // Count occurrences in title
      const titleCount = titleWords.filter(word => word.includes(queryWord)).length;
      // Count occurrences in description
      const descriptionCount = descriptionWords.filter(word => word.includes(queryWord)).length;
      
      // TF-IDF approximation (simplified)
      // In a full implementation, IDF would be calculated across all documents
      // Here we use a simplified version with fixed weights
      score += titleCount * 2.0; // Title terms weighted higher
      score += descriptionCount * 1.0; // Description terms weighted lower
    }
    
    return score;
  }

  /**
   * Apply boost factors based on match type
   * @param product - Product to evaluate
   * @param query - Search query
   * @returns Boost factor (1x, 2x, or 3x)
   */
  private getBoostFactor(product: IProduct, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const titleLower = product.title.en.toLowerCase().trim();
    const descriptionLower = product.description.en.toLowerCase().trim();
    
    // Exact title match: 3x boost
    if (titleLower === queryLower) {
      return 3.0;
    }
    
    // Title contains query: 2x boost
    if (titleLower.includes(queryLower)) {
      return 2.0;
    }
    
    // Description contains query: 1x boost (base)
    if (descriptionLower.includes(queryLower)) {
      return 1.0;
    }
    
    // Fuzzy match or partial match: 0.5x
    return 0.5;
  }

  /**
   * Rank search results using TF-IDF scoring with boost factors
   * @param results - Array of products to rank
   * @param query - Search query
   * @returns Ranked array of search results with scores
   */
  rankResults(results: IProduct[], query: string): SearchResult[] {
    const scoredResults: SearchResult[] = results.map(product => {
      const tfidfScore = this.calculateTFIDF(product, query);
      const boostFactor = this.getBoostFactor(product, query);
      const ratingWeight = product.weightedRating || 0;
      
      // Combined score: TF-IDF * boost factor * (1 + rating weight)
      // Rating weight adds a small bonus but doesn't dominate
      const score = tfidfScore * boostFactor * (1 + ratingWeight * 0.1);
      
      return {
        product,
        score,
      };
    });
    
    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);
    
    return scoredResults;
  }

  /**
   * Search for products using text search and fuzzy matching
   * @param query - Search query string
   * @param page - Page number (1-indexed)
   * @param limit - Number of results per page
   * @returns Search results with pagination
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchQueryResult> {
    if (!query || query.trim().length === 0) {
      return {
        products: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0,
      };
    }
    
    const queryTrimmed = query.trim();
    
    // First, try MongoDB text search for initial results
    let textSearchResults: IProduct[] = [];
    
    try {
      textSearchResults = await Product.find(
        {
          $text: { $search: queryTrimmed },
          isActive: true,
          verificationStatus: 'approved',
        },
        {
          score: { $meta: 'textScore' },
        }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(100) // Get more results for fuzzy matching
        .populate('sellerId', 'firstName lastName businessName');
    } catch (error) {
      // If text search fails (e.g., no text index), fall back to regex search
      textSearchResults = [];
    }
    
    // If text search returns few results, also try fuzzy matching on all products
    if (textSearchResults.length < 20) {
      const allProducts = await Product.find({
        isActive: true,
        verificationStatus: 'approved',
      })
        .limit(500) // Limit to prevent performance issues
        .populate('sellerId', 'firstName lastName businessName');
      
      // Filter products using fuzzy matching
      const fuzzyMatches = allProducts.filter(product => {
        return (
          this.fuzzyMatch(queryTrimmed, product.title.en, 2) ||
          this.fuzzyMatch(queryTrimmed, product.description.en, 2)
        );
      });
      
      // Combine results, removing duplicates
      const combinedResults = [...textSearchResults];
      const existingIds = new Set(textSearchResults.map(p => p._id.toString()));
      
      for (const product of fuzzyMatches) {
        if (!existingIds.has(product._id.toString())) {
          combinedResults.push(product);
        }
      }
      
      textSearchResults = combinedResults;
    }
    
    // Rank results using TF-IDF and boost factors
    const rankedResults = this.rankResults(textSearchResults, queryTrimmed);
    
    // Apply pagination
    const totalCount = rankedResults.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;
    
    const paginatedResults = rankedResults
      .slice(skip, skip + limit)
      .map(result => result.product);
    
    return {
      products: paginatedResults,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }

  /**
   * Get autocomplete suggestions based on query
   * @param query - Partial search query
   * @param limit - Maximum number of suggestions
   * @returns Array of suggestions
   */
  async getSuggestions(query: string, limit: number = 10): Promise<Suggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const queryTrimmed = query.trim();
    const queryLower = queryTrimmed.toLowerCase();
    
    // Find products where title starts with or contains the query
    const products = await Product.find({
      isActive: true,
      verificationStatus: 'approved',
      $or: [
        { 'title.en': { $regex: `^${queryTrimmed}`, $options: 'i' } },
        { 'title.en': { $regex: queryTrimmed, $options: 'i' } },
      ],
    })
      .select('title category')
      .limit(limit * 2) // Get more to filter
      .sort({ weightedRating: -1 });
    
    // Extract unique suggestions
    const suggestions: Suggestion[] = [];
    const seenTexts = new Set<string>();
    
    for (const product of products) {
      const title = product.title.en;
      const titleLower = title.toLowerCase();
      
      // Only include if title contains the query
      if (titleLower.includes(queryLower)) {
        if (!seenTexts.has(titleLower)) {
          suggestions.push({
            text: title,
            category: product.category,
          });
          seenTexts.add(titleLower);
        }
      }
      
      if (suggestions.length >= limit) {
        break;
      }
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const searchService = new SearchService();
