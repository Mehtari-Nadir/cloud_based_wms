import { createFileRoute } from '@tanstack/react-router'
import { useAction } from "convex/react";
import { api } from 'convex/_generated/api';
import { useAuth } from '@clerk/clerk-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IconSearch, IconX, IconPackage, IconLoader2 } from '@tabler/icons-react';

// Search result type from semantic search
type SearchResult = {
  _id: string;
  name: string;
  sku: string;
  description: string;
  quantity: number;
  unit: string;
  storeName: string;
  warehouseName: string;
  imageUrl: string | null;
};

export const Route = createFileRoute('/admin/search/')({
  component: SearchPage,
})

function SearchPage() {
  const { userId } = useAuth();
  const semanticSearch = useAction(api.embedding.semanticSearch);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const results = await semanticSearch({
        query: searchQuery,
        clerkId: userId,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">Search Products</h1>
        <p className="text-muted-foreground">
          Search across all your inventory items using natural language.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Try: 'plumbing materials', 'cleaning chemicals', 'tools for pipes'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
            disabled={isSearching}
          />
          {searchQuery && !isSearching && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
          {isSearching ? (
            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <IconSearch className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="text-center py-12 border rounded-md bg-muted/30">
          <IconLoader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <h3 className="text-lg font-medium mb-1">Searching...</h3>
          <p className="text-muted-foreground">
            Finding relevant products in your inventory.
          </p>
        </div>
      )}

      {/* Results */}
      {!isSearching && hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
            </span>
          </div>

          {searchResults.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-md border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                            <IconPackage className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.storeName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            product.quantity <= 10 
                              ? "destructive" 
                              : product.quantity <= 50 
                                ? "secondary" 
                                : "default"
                          }
                        >
                          {product.quantity} {product.unit}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md bg-muted/30">
              <IconSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No products found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or use different words.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!isSearching && !hasSearched && (
        <div className="text-center py-12 border rounded-md bg-muted/30">
          <IconSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Semantic Search</h3>
          <p className="text-muted-foreground">
            Search your inventory using natural language. Try queries like "plumbing supplies" or "cleaning products".
          </p>
        </div>
      )}
    </div>
  );
}
