/**
 * Sasl - Social Asynchronous Sharing Layer
 * Marketplace – Advanced shopping with wishlist, reviews, filtering, nearby mesh discovery
 */
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMesh } from '../hooks/useMesh';
import { db } from '../services/offlineDB';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Loader2, Package, AlertCircle, PlusCircle, Image as ImageIcon,
  Heart, Search, Filter, Star, TrendingUp, MapPin, X, ChevronDown,
  DollarSign, ShoppingBag, Truck, RotateCcw, MessageCircle, Grid3X3, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebRTCPrivateChat from './WebRTCPrivateChat';
import { useTranslation } from 'react-i18next';
import { t } from '../services/translateHelper';


interface Product {
  id: string;
  title: string;
  description?: string;
  price: string;
  seller_name: string;
  seller_avatar?: string;
  seller_rating?: number;
  image_url: string | null;
  stock: number;
  sales_count?: number;
  average_rating?: number;
  review_count?: number;
  reviews?: Review[];
  is_wishlisted?: boolean;
  category_name?: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  product_count?: number;
}

type ViewMode = 'grid' | 'list';

export default function Marketplace() {
  const { user } = useAuth();
  const { isOnline } = useMesh();
  const { t } = useTranslation();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('-created_at');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Sell form
  const [showSellForm, setShowSellForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('1');
  const [newCategory, setNewCategory] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Product detail
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Chat
  const [chatRoom, setChatRoom] = useState<string | null>(null);

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>([]);
  
  // ============================================================
  // FETCH
  // ============================================================
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isOnline) {
        const cached = await db.products.toArray();
        setProducts(cached as any);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (minPrice) params.set('min_price', minPrice);
      if (maxPrice) params.set('max_price', maxPrice);
      if (inStockOnly) params.set('in_stock', 'true');
      params.set('ordering', sortBy);

      const res = await api.get(`/marketplace/products/?${params.toString()}`);
      const results = res.data.results || [];

      await db.products.clear();
      for (const p of results) {
        await db.products.put({
          id: p.id, title: p.title, price: p.price,
          seller: p.seller_name, image_url: p.image_url, stock: p.stock,
        });
      }
      setProducts(results);
    } catch (err) {
      setError('Could not load marketplace.');
    } finally {
      setLoading(false);
    }
  }, [isOnline, searchQuery, selectedCategory, sortBy, minPrice, maxPrice, inStockOnly]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/marketplace/categories/');
      setCategories(res.data.results || res.data || []);
    } catch {}
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const buy = async (productId: string) => {
    if (!user) return toast.error('Please login first');
    if (!isOnline) return toast.error('Buying works online only');
    try {
      await api.post(`/marketplace/products/${productId}/purchase/`, { quantity: 1 });
      toast.success('🎉 Purchased successfully!');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Purchase failed');
    }
  };

    const toggleWishlist = async (productId: string) => {
  // Optimistic update — instantly toggle the heart
  setProducts(prev => prev.map(p => p.id === productId ? {
    ...p,
    is_wishlisted: !p.is_wishlisted
  } : p));
  
  try {
    const res = await api.post(`/marketplace/products/${productId}/toggle_wishlist/`, {});
    // Sync with server response
    if (res.data.status === 'added') {
      setWishlist(prev => [...prev, productId]);
      toast.success('Added to wishlist! ❤️');
    } else {
      setWishlist(prev => prev.filter(id => id !== productId));
      toast.success('Removed from wishlist');
    }
    // Refresh products to get accurate server state
    fetchProducts();
  } catch {
    // Revert on error
    toast.error('Failed to update wishlist');
    fetchProducts(); // Refresh to get correct state
  }
};
  const submitReview = async (productId: string) => {
    try {
      await api.post(`/marketplace/products/${productId}/review/`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Review submitted!');
      setShowReviews(false);
      setReviewComment('');
      setReviewRating(5);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Review failed');
    }
  };

  const createProduct = async () => {
    if (!newTitle || !newPrice) return toast.error('Title and price required');
    if (!isOnline) return toast.error('Create products online only');
    
    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('description', newDesc);
    formData.append('price', newPrice);
    formData.append('stock', newStock || '1');
    if (newCategory) formData.append('category', newCategory);
    if (newImage) formData.append('image', newImage);

    try {
      await api.post('/marketplace/products/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Product listed!');
      resetSellForm();
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to list product');
    }
  };

  const resetSellForm = () => {
    setShowSellForm(false);
    setNewTitle(''); setNewDesc(''); setNewPrice(''); setNewStock('1');
    setNewCategory(''); setNewImage(null); setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star key={i} size={12} className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
    ));
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <ShoppingBag className="text-green-500" /> {t('marketplace')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t('buy_sell_tagline')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}>
              <Grid3X3 size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow' : ''}`}>
              <List size={18} />
            </button>
          </div>
           <button onClick={() => setShowSellForm(!showSellForm)} className="btn-primary flex items-center gap-2">
            <PlusCircle size={18} /> {showSellForm ? t('cancel') : t('sell_item')}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass p-4 rounded-2xl mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-10" placeholder={t('search_products')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost flex items-center gap-1">
            <Filter size={18} /> {t('filters')} {showFilters ? <ChevronDown size={14} className="rotate-180" /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${!selectedCategory ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t('all')}
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.slug)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${selectedCategory === cat.slug ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cat.name} {cat.product_count ? `(${cat.product_count})` : ''}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-3 pt-3 border-t">
                <input className="input-field w-32" type="number" placeholder="Min price" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input className="input-field w-32" type="number" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="rounded" />
                  {t('in_stock_only')}
                </label>
                <select className="input-field w-40" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="-created_at">Newest</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="-sales_count">Best Selling</option>
                  <option value="-average_rating">Top Rated</option>
                </select>
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); setInStockOnly(false); }} className="btn-ghost text-sm">Clear</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sell Form */}
      <AnimatePresence>
        {showSellForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass p-6 rounded-2xl mb-6 space-y-3 shadow-xl border-2 border-green-200">
            <h3 className="font-bold text-lg flex items-center gap-2"><Package size={18} /> {t('list_new_product')}</h3>
            <input className="input-field" placeholder={t('product_title')} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea className="input-field" placeholder={t('description')} value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            <div className="grid grid-cols-3 gap-3">
              <input className="input-field" type="number" placeholder={t('price')} value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              <input className="input-field" type="number" placeholder={t('stock')} value={newStock} onChange={e => setNewStock(e.target.value)} />
              <select className="input-field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                <option value="">Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="btn-ghost cursor-pointer flex items-center gap-1">
                <ImageIcon size={18} /> {newImage ? newImage.name : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {imagePreview && <img src={imagePreview} alt="preview" className="h-12 w-12 rounded object-cover" />}
            </div>
            <button onClick={createProduct} className="btn-primary w-full">🚀 List Product</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={48} /></div>
      ) : error ? (
        <div className="glass p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-lg text-gray-600">{error}</p>
          <button onClick={fetchProducts} className="btn-primary mt-4">Retry</button>
        </div>
      ) : products.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <Package size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('no_products_found')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('try_adjusting_filters')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p, idx) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="glass rounded-2xl overflow-hidden hover:shadow-xl transition group cursor-pointer"
              onClick={() => setSelectedProduct(p)}
            >
              <div className="h-48 bg-gray-100 overflow-hidden relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={48} /></div>
                )}
                <button 
  onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
  className={`absolute top-2 right-2 p-2 rounded-full shadow transition ${
    p.is_wishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'
  }`}
>
  <Heart size={16} className={p.is_wishlisted ? 'fill-white' : ''} />
</button>
                {p.stock <= 3 && p.stock > 0 && (
                  <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">Only {p.stock} left</span>
                )}
                {p.stock === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Sold Out</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                <div className="flex items-center gap-1 mt-1">
                  {p.average_rating ? renderStars(p.average_rating) : null}
                  {p.review_count ? <span className="text-xs text-gray-400">({p.review_count})</span> : null}
                </div>
                <p className="text-xs text-gray-500 mt-1">by {p.seller_name}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-bold text-green-600">${p.price}</span>
                  <button onClick={(e) => { e.stopPropagation(); buy(p.id); }} disabled={p.stock === 0}
                    className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 transition disabled:opacity-50">
                    <ShoppingCart size={14} /> {t('buy')}
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setChatRoom(`product-${p.id}`); }}
                  className="mt-2 w-full text-xs text-gray-400 hover:text-green-500 transition flex items-center justify-center gap-1">
                  <MessageCircle size={12} /> {t('chat_with_seller')}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="glass p-4 rounded-2xl flex gap-4 items-center hover:shadow-md transition cursor-pointer" onClick={() => setSelectedProduct(p)}>
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={24} /></div>}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-gray-500">by {p.seller_name} · {p.stock} in stock</p>
                <div className="flex items-center gap-1 mt-1">{p.average_rating ? renderStars(p.average_rating) : null}</div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-600">${p.price}</p>
                <button onClick={(e) => { e.stopPropagation(); buy(p.id); }} disabled={p.stock === 0}
                  className="btn-primary text-xs mt-1">{t('buy_now')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-64 bg-gray-100">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.title} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center"><Package size={64} className="text-gray-300" /></div>}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 bg-white rounded-full p-2 shadow">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold">{selectedProduct.title}</h2>
                <p className="text-gray-500 mt-1">{selectedProduct.description || 'No description'}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-3xl font-bold text-green-600">${selectedProduct.price}</span>
                  <span className={`text-sm px-3 py-1 rounded-full ${selectedProduct.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedProduct.stock > 0 ? `${selectedProduct.stock} in stock` : 'Sold Out'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Sold by @{selectedProduct.seller_name} · {selectedProduct.sales_count || 0} sales</p>
                
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { buy(selectedProduct.id); setSelectedProduct(null); }} disabled={selectedProduct.stock === 0}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <ShoppingCart size={18} /> {t('buy_now')}
                  </button>
                  <button onClick={() => toggleWishlist(selectedProduct.id)} className="btn-ghost">
                    <Heart size={20} className={selectedProduct.is_wishlisted ? 'fill-red-500 text-red-500' : ''} />
                  </button>
                </div>

                {/* Reviews */}
                <div className="mt-4 pt-4 border-t">
                  <button onClick={() => setShowReviews(!showReviews)} className="font-semibold text-sm flex items-center gap-1">
                    <Star size={16} /> {t('reviews')} ({selectedProduct.review_count || 0}) {showReviews ? <ChevronDown size={14} className="rotate-180" /> : <ChevronDown size={14} />}
                  </button>
                  {showReviews && (
                    <div className="mt-2 space-y-2">
                      {selectedProduct.reviews?.map(r => (
                        <div key={r.id} className="bg-gray-50 p-3 rounded-xl">
                          <div className="flex items-center gap-2"><span className="font-semibold text-sm">{r.reviewer_name}</span>{renderStars(r.rating)}</div>
                          <p className="text-sm text-gray-600">{r.comment}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">
                        {[1,2,3,4,5].map(i => (
                          <button key={i} onClick={() => setReviewRating(i)}>
                            <Star size={18} className={i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                          </button>
                        ))}
                      </div>
                      <textarea className="input-field text-sm" placeholder={t('write_review')} value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={2} />
                      <button onClick={() => submitReview(selectedProduct.id)} className="btn-primary text-sm">{t('submit_review')}</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {chatRoom && <WebRTCPrivateChat roomId={chatRoom} onClose={() => setChatRoom(null)} />}
    </div>
  );
}