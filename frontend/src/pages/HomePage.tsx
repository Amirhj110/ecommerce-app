import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { productsApi, type Product } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productsApi.getProducts({
          is_active: 'true',
          ordering: '-created_at',
          page_size: 8,
        });
        setFeaturedProducts(response.data.results);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 bg-luxury-charcoal">
          <img
            src="/hero-bg.jpg"
            alt="Luxury background"
            className="w-full h-full object-cover opacity-40"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-charcoal/80 via-luxury-charcoal/40 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl animate-slide-up">
            <p className="text-luxury-gold text-sm uppercase tracking-[0.3em] mb-4">
              New Collection 2026
            </p>
            <h1 className="font-serif text-5xl md:text-7xl text-white leading-tight mb-6">
              Timeless
              <br />
              <span className="italic font-light">Elegance</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-md">
              Discover our curated collection of luxury items, crafted with precision and designed for the discerning individual.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center bg-luxury-gold text-luxury-charcoal px-8 py-4 text-sm font-semibold uppercase tracking-wider hover:bg-white transition-colors"
            >
              Shop Now
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-luxury-gold text-sm uppercase tracking-[0.2em] mb-2">
            Curated Selection
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-luxury-charcoal">
            Featured Products
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
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
        ) : featuredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/shop"
                className="inline-flex items-center border border-luxury-charcoal text-luxury-charcoal px-8 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-luxury-charcoal hover:text-luxury-cream transition-colors"
              >
                View All Products
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-luxury-gray">No products available yet.</p>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8">
              <div className="w-16 h-16 bg-luxury-cream rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-luxury-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-luxury-charcoal mb-2">Premium Quality</h3>
              <p className="text-luxury-gray text-sm">Every item is carefully selected for exceptional craftsmanship.</p>
            </div>
            <div className="p-8">
              <div className="w-16 h-16 bg-luxury-cream rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-luxury-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-luxury-charcoal mb-2">Secure Shipping</h3>
              <p className="text-luxury-gray text-sm">Your orders are packaged with care and shipped worldwide.</p>
            </div>
            <div className="p-8">
              <div className="w-16 h-16 bg-luxury-cream rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-luxury-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-luxury-charcoal mb-2">24/7 Support</h3>
              <p className="text-luxury-gray text-sm">Our dedicated team is here to assist you at any time.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
