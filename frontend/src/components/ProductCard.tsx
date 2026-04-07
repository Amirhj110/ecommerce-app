import { Link } from 'react-router-dom';
import { Star, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import type { Product } from '../lib/api';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    if (product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    await addItem(product.id, 1);
  };

  const imageUrl = product.primary_image?.image_url || '/placeholder-product.jpg';

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="card-luxury overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Discount Badge */}
          {product.discount_percentage && (
            <div className="absolute top-3 left-3 bg-luxury-gold text-luxury-charcoal text-xs font-semibold px-2 py-1">
              -{product.discount_percentage}%
            </div>
          )}

          {/* Out of Stock Badge */}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <span className="text-sm font-medium text-luxury-charcoal uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}

          {/* Quick Add Button */}
          {product.stock > 0 && (
            <button
              onClick={handleQuickAdd}
              className="absolute bottom-0 left-0 right-0 bg-luxury-charcoal text-luxury-cream py-3 text-xs font-semibold uppercase tracking-wider translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center hover:bg-luxury-gold hover:text-luxury-charcoal"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Quick Add
            </button>
          )}
        </div>

        {/* Content */}
        <div className="pt-4">
          {/* Category */}
          <p className="text-xs text-luxury-gray uppercase tracking-wider mb-1">
            {product.category_name || 'Uncategorized'}
          </p>

          {/* Name */}
          <h3 className="font-serif text-lg text-luxury-charcoal mb-2 line-clamp-1 group-hover:text-luxury-gold transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          {product.review_count > 0 && (
            <div className="flex items-center mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.floor(product.average_rating || 0)
                        ? 'text-luxury-gold fill-luxury-gold'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-luxury-gray ml-2">
                ({product.review_count})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-luxury-charcoal">
              ${parseFloat(product.price).toFixed(2)}
            </span>
            {product.compare_at_price && (
              <span className="text-sm text-luxury-gray line-through">
                ${parseFloat(product.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
