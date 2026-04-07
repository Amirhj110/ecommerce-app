import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingBag, ArrowLeft, Minus, Plus, Check } from 'lucide-react';
import { productsApi, reviewsApi, type ProductDetail, type ProductVariant, type Review } from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: '', comment: '' });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const response = await productsApi.getProduct(slug);
        setProduct(response.data);
        if (response.data.images.length > 0) {
          setSelectedImage(response.data.images[0].image_url);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('Product not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product) {
      setReviews(product.reviews);
    }
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    const stock = selectedVariant ? selectedVariant.stock : product.stock;
    if (quantity > stock) {
      toast.error(`Only ${stock} items available`);
      return;
    }

    await addItem(product.id, quantity, selectedVariant?.id);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !isAuthenticated) return;

    try {
      const response = await reviewsApi.createReview({
        product: product.id,
        ...newReview,
      });
      setReviews([response.data, ...reviews]);
      setIsAddingReview(false);
      setNewReview({ rating: 5, title: '', comment: '' });
      toast.success('Review submitted successfully');
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  // Get unique sizes and colors
  const sizes = [...new Set(product?.variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(product?.variants.map((v) => v.color).filter(Boolean))];

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Update selected variant when size/color changes
  useEffect(() => {
    if (product?.variants.length) {
      const variant = product.variants.find(
        (v) => v.size === selectedSize && v.color === selectedColor
      );
      setSelectedVariant(variant || null);
    }
  }, [selectedSize, selectedColor, product]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-gray-200 rounded" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-20 px-4 text-center">
        <p className="text-luxury-gray text-lg">Product not found</p>
        <Link to="/shop" className="text-luxury-gold hover:underline mt-4 inline-block">
          Back to Shop
        </Link>
      </div>
    );
  }

  const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
  const finalPrice = selectedVariant
    ? parseFloat(selectedVariant.final_price)
    : parseFloat(product.price);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          to="/shop"
          className="inline-flex items-center text-sm text-luxury-gray hover:text-luxury-charcoal mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-100 mb-4 overflow-hidden">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-20 h-20 flex-shrink-0 border-2 overflow-hidden ${
                      selectedImage === img.image_url
                        ? 'border-luxury-gold'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <p className="text-luxury-gold text-sm uppercase tracking-wider mb-2">
              {product.category_name || 'Uncategorized'}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-luxury-charcoal mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            {product.review_count > 0 && (
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.average_rating || 0)
                          ? 'text-luxury-gold fill-luxury-gold'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-luxury-gray ml-2">
                  {product.average_rating} ({product.review_count} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-semibold text-luxury-charcoal">
                ${finalPrice.toFixed(2)}
              </span>
              {product.compare_at_price && (
                <span className="text-lg text-luxury-gray line-through">
                  ${parseFloat(product.compare_at_price).toFixed(2)}
                </span>
              )}
              {product.discount_percentage && (
                <span className="bg-luxury-gold text-luxury-charcoal text-xs font-semibold px-2 py-1">
                  Save {product.discount_percentage}%
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-luxury-gray mb-8 leading-relaxed">
              {product.description}
            </p>

            {/* Variants */}
            {sizes.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-luxury-charcoal mb-2">
                  Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size === selectedSize ? '' : size)}
                      className={`px-4 py-2 border text-sm transition-colors ${
                        selectedSize === size
                          ? 'border-luxury-charcoal bg-luxury-charcoal text-white'
                          : 'border-luxury-charcoal/20 hover:border-luxury-charcoal'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colors.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-luxury-charcoal mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color === selectedColor ? '' : color)}
                      className={`px-4 py-2 border text-sm transition-colors ${
                        selectedColor === color
                          ? 'border-luxury-charcoal bg-luxury-charcoal text-white'
                          : 'border-luxury-charcoal/20 hover:border-luxury-charcoal'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-6">
              {availableStock > 0 ? (
                <div className="flex items-center text-green-600 text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  In Stock ({availableStock} available)
                </div>
              ) : (
                <div className="text-red-600 text-sm">Out of Stock</div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center border border-luxury-charcoal/20">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-3 hover:bg-luxury-cream transition-colors"
                  disabled={availableStock <= 0}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-3 font-medium min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="px-3 py-3 hover:bg-luxury-cream transition-colors"
                  disabled={availableStock <= 0}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={availableStock <= 0}
                className="flex-1 bg-luxury-charcoal text-luxury-cream py-3 px-8 font-semibold uppercase tracking-wider text-sm hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {availableStock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>

            {/* Product Details */}
            <div className="border-t border-luxury-charcoal/10 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-luxury-gray">SKU:</span>
                  <span className="ml-2 text-luxury-charcoal">
                    {selectedVariant?.sku || product.sku}
                  </span>
                </div>
                <div>
                  <span className="text-luxury-gray">Seller:</span>
                  <span className="ml-2 text-luxury-charcoal">{product.seller_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t border-luxury-charcoal/10 pt-12">
          <h2 className="font-serif text-2xl text-luxury-charcoal mb-8">
            Customer Reviews ({reviews.length})
          </h2>

          {/* Add Review */}
          {isAuthenticated && !isAddingReview && (
            <button
              onClick={() => setIsAddingReview(true)}
              className="mb-8 border border-luxury-charcoal text-luxury-charcoal px-6 py-2 text-sm font-medium hover:bg-luxury-charcoal hover:text-luxury-cream transition-colors"
            >
              Write a Review
            </button>
          )}

          {isAddingReview && (
            <form onSubmit={handleSubmitReview} className="mb-8 bg-white p-6 border border-luxury-charcoal/10">
              <div className="mb-4">
                <label className="block text-sm font-medium text-luxury-charcoal mb-2">
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= newReview.rating
                            ? 'text-luxury-gold fill-luxury-gold'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-luxury-charcoal mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className="w-full border border-luxury-charcoal/20 px-4 py-2 focus:border-luxury-gold outline-none"
                  placeholder="Summarize your experience"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-luxury-charcoal mb-2">
                  Review
                </label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  rows={4}
                  className="w-full border border-luxury-charcoal/20 px-4 py-2 focus:border-luxury-gold outline-none"
                  placeholder="Share your thoughts about this product"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-luxury-charcoal text-luxury-cream px-6 py-2 text-sm font-medium hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingReview(false)}
                  className="border border-luxury-charcoal/20 text-luxury-charcoal px-6 py-2 text-sm font-medium hover:border-luxury-charcoal transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-luxury-charcoal/10 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-luxury-charcoal">
                        {review.user_name}
                      </span>
                      {review.verified_purchase && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-luxury-gray">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-luxury-gold fill-luxury-gold'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <h4 className="font-medium text-luxury-charcoal mb-1">{review.title}</h4>
                  )}
                  <p className="text-luxury-gray text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-luxury-gray">No reviews yet. Be the first to review!</p>
          )}
        </div>
      </div>
    </div>
  );
}
