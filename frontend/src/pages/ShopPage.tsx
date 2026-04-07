import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { productsApi, type Product, type Category } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('min_price') || '',
    max: searchParams.get('max_price') || '',
  });
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('in_stock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('ordering') || '-created_at');

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        is_active: 'true',
        page_size: 20,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (priceRange.min) params.min_price = priceRange.min;
      if (priceRange.max) params.max_price = priceRange.max;
      if (inStockOnly) params.in_stock = 'true';
      if (sortBy) params.ordering = sortBy;

      const response = await productsApi.getProducts(params);
      setProducts(response.data.results);
      setTotalCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, priceRange, inStockOnly, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await productsApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (selectedCategory) params.category = selectedCategory;
    if (priceRange.min) params.min_price = priceRange.min;
    if (priceRange.max) params.max_price = priceRange.max;
    if (inStockOnly) params.in_stock = 'true';
    if (sortBy && sortBy !== '-created_at') params.ordering = sortBy;

    setSearchParams(params);
  }, [searchQuery, selectedCategory, priceRange, inStockOnly, sortBy, setSearchParams]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setInStockOnly(false);
    setSortBy('-created_at');
  };

  const hasActiveFilters = searchQuery || selectedCategory || priceRange.min || priceRange.max || inStockOnly;

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-8 border-b border-luxury-charcoal/10">
          <h1 className="font-serif text-3xl md:text-4xl text-luxury-charcoal mb-4">Shop</h1>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-luxury-gray" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-luxury-charcoal/10 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-luxury-gray hover:text-luxury-charcoal" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 py-8">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden flex items-center justify-center gap-2 py-3 border border-luxury-charcoal/20 text-sm font-medium uppercase tracking-wider"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          {/* Sidebar Filters */}
          <aside className={`lg:w-64 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-serif text-lg text-luxury-charcoal mb-4">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`block w-full text-left py-2 text-sm transition-colors ${
                      !selectedCategory ? 'text-luxury-gold font-medium' : 'text-luxury-gray hover:text-luxury-charcoal'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id.toString())}
                      className={`block w-full text-left py-2 text-sm transition-colors ${
                        selectedCategory === category.id.toString()
                          ? 'text-luxury-gold font-medium'
                          : 'text-luxury-gray hover:text-luxury-charcoal'
                      }`}
                    >
                      {category.name} ({category.product_count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-serif text-lg text-luxury-charcoal mb-4">Price Range</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-1/2 px-3 py-2 bg-white border border-luxury-charcoal/10 focus:border-luxury-gold outline-none text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-1/2 px-3 py-2 bg-white border border-luxury-charcoal/10 focus:border-luxury-gold outline-none text-sm"
                  />
                </div>
              </div>

              {/* In Stock */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 border-luxury-charcoal/30 text-luxury-gold focus:ring-luxury-gold rounded"
                  />
                  <span className="text-sm text-luxury-charcoal">In Stock Only</span>
                </label>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-luxury-gold hover:text-luxury-charcoal transition-colors underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort & Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-luxury-gray">
                {isLoading ? 'Loading...' : `${totalCount} products`}
              </p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-luxury-charcoal/20 px-4 py-2 pr-10 text-sm focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none cursor-pointer"
                >
                  <option value="-created_at">Newest First</option>
                  <option value="created_at">Oldest First</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                  <option value="-name">Name: Z-A</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxury-gray pointer-events-none" />
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card-luxury">
                    <div className="aspect-[4/5] bg-gray-200 animate-pulse" />
                    <div className="pt-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                      <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                      <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-luxury-gray text-lg mb-4">No products found</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-luxury-gold hover:text-luxury-charcoal transition-colors underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
