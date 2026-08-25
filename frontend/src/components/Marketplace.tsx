/**
 * Sasl - Marketplace – Premium Design Edition
 */
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMesh } from '../hooks/useMesh';
import { db } from '../services/offlineDB';
import toast from 'react-hot-toast';
import {
    ShoppingCart, Loader2, Package, AlertCircle, PlusCircle, Image as ImageIcon, CheckCircle2,
  Heart, Search, Filter, Star, X, ChevronDown,
  DollarSign, ShoppingBag, MessageCircle, Grid3X3, List, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketplaceChat from './MarketplaceChat';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';
import AdBanner from './AdBanner';
import { cacheFeatureData, loadCachedFeature, getPendingActions, clearOfflineAction, queueOfflineAction } from '../services/offlineDB';



interface Product {
  id: string;
  title: string;
  description?: string;
  price: string;
  seller_name: string;
  seller_phone?: string;
  seller_avatar?: string;
  seller_rating?: number;
  image_url: string | null;
    images?: Array<{ id: string; image_url: string; order: number }>;
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
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
      const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [showSellForm, setShowSellForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('1');
  const [newCategory, setNewCategory] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
    const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop');
  const [orders, setOrders] = useState<any[]>([]);
  
  
  const fetchProducts = useCallback(async () => {

      
    setLoading(true);
    setError(null);
    try {
     
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
        await db.products.put({ id: p.id, title: p.title, price: p.price, seller: p.seller_name, image_url: p.image_url, stock: p.stock });
      }
      setProducts(results);
      await cacheFeatureData('products', results);
    } catch { setError('Could not load marketplace.'); }
    finally { setLoading(false); }
  }, [searchQuery, selectedCategory, sortBy, minPrice, maxPrice, inStockOnly]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/marketplace/orders/');
      setOrders(res.data.results || res.data || []);
    } catch {}
  };

  const fetchCategories = async () => {
    try { const res = await api.get('/marketplace/categories/'); setCategories(res.data.results || res.data || []); } catch {}
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts]);
  

    useEffect(() => {
    if (selectedProduct && user?.username === selectedProduct.seller_name) {
      api.get(`/marketplace/orders/?product_id=${selectedProduct.id}&status=pending`)
        .then(res => setPendingOrders(res.data.results || res.data || []))
        .catch(() => setPendingOrders([]));
    } else {
      setPendingOrders([]);
    }
  }, [selectedProduct, user]);

    const requestBuy = async (productId: string) => {
    if (!user) return toast.error('Please login first');
    if (!isOnline) return toast.error('Buying works online only');
    try {
      await api.post(`/marketplace/products/${productId}/request_purchase/`, { quantity: 1 });
      setSentRequests(prev => new Set(prev).add(productId));
      toast.success('📩 Purchase request sent to seller!');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Request failed'); }
  };

  const toggleWishlist = async (productId: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_wishlisted: !p.is_wishlisted } : p));
    try {
      const res = await api.post(`/marketplace/products/${productId}/toggle_wishlist/`, {});
      if (res.data.status === 'added') { setWishlist(prev => [...prev, productId]); toast.success('Added to wishlist! ❤️'); }
      else { setWishlist(prev => prev.filter(id => id !== productId)); toast.success('Removed from wishlist'); }
      fetchProducts();
    } catch { toast.error('Failed to update wishlist'); fetchProducts(); }
  };

  const submitReview = async (productId: string) => {
    try {
      await api.post(`/marketplace/products/${productId}/review/`, { rating: reviewRating, comment: reviewComment });
      toast.success('Review submitted!');
      setShowReviews(false); setReviewComment(''); setReviewRating(5);
      fetchProducts();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Review failed'); }
  };

const resetSellForm = () => {
    setShowSellForm(false); setNewTitle(''); setNewDesc(''); setNewPrice(''); setNewStock('1');
    setNewCategory(''); setNewImage(null); setImagePreview(null);
  };

    const createProduct = async (): Promise<void> => {
    if (!newTitle || !newPrice) { toast.error('Title and price required'); return; }
    if (!isOnline) { toast.error('Create products online only'); return; }
    const formData = new FormData();
    formData.append('title', newTitle); formData.append('description', newDesc);
    formData.append('price', newPrice); formData.append('stock', newStock || '1');
    if (newCategory) formData.append('category', newCategory);
    if (newImages.length > 0) {
  formData.append('image', newImages[0]); // Main image
  // Send additional images
  for (let i = 1; i < newImages.length; i++) {
    formData.append('additional_images', newImages[i]);
  }
}
    try {
      const res = await api.post('/marketplace/products/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Product listed!');
      resetSellForm(); 
      fetchProducts();
     
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to list product'); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewImages(prev => [...prev, ...files].slice(0, 10)); // Max 10 images
      const previews = files.map(f => URL.createObjectURL(f));
      setImagePreviews(prev => [...prev, ...previews].slice(0, 10));
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star key={i} size={12} className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
    ));
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
          
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <ShoppingBag className="text-green-500" /> {t('marketplace')}
          </h2>

          <p className="text-gray-500 text-sm mt-1">{t('buy_sell_tagline')}</p>

        </div>
                {/* Tab Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => { setActiveTab('shop'); fetchProducts(); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'shop' ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'}`}
          >
            🛍️ {t('shop')}
          </button>
          <button
            onClick={() => { setActiveTab('orders'); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-500'}`}
          >
            📦 {t('my_orders')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}><Grid3X3 size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow' : ''}`}><List size={18} /></button>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSellForm(!showSellForm)} className="btn-primary flex items-center gap-2">
            <PlusCircle size={18} /> {showSellForm ? t('cancel') : t('sell_item')}
          </motion.button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div className="glass-card p-4 rounded-2xl mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-10" placeholder={t('search_products')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost flex items-center gap-1">
            <Filter size={18} /> {t('filters')} <ChevronDown size={14} className={`transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${!selectedCategory ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('all')}</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.slug)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${selectedCategory === cat.slug ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat.name} {cat.product_count ? `(${cat.product_count})` : ''}</button>
          ))}
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-3 pt-3 border-t">
                <input className="input-field w-32" type="number" placeholder={t('Min price')} value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input className="input-field w-32" type="number" placeholder={t('Max price')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="rounded" />{t('in_stock_only')}</label>
                <select className="input-field w-40" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="-created_at">{t('Newest')}</option>
                  <option value="price">{t('Price: Low to High')}</option>
                  <option value="-price">{t('Price: High to Low')}</option>
                  <option value="-sales_count">{t('Best Selling')}</option>
                  <option value="-average_rating">{t('Top Rated')}</option>
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
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-6 rounded-2xl mb-6 space-y-3 border-2 border-green-200">
            <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-green-500" /> {t('list_new_product')}</h3>
            <input className="input-field" placeholder={t('product_title')} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea className="input-field" placeholder={t('description')} value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            <div className="grid grid-cols-3 gap-3">
              <input className="input-field" type="number" placeholder={t('price')} value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              <input className="input-field" type="number" placeholder={t('stock')} value={newStock} onChange={e => setNewStock(e.target.value)} />
              <select className="input-field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                <option value="">{t('Category')}</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="btn-ghost cursor-pointer flex items-center gap-1"><ImageIcon size={18} /> Upload Images (max 10)<input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} /></label>
              {imagePreviews.map((preview, i) => (
                <img key={i} src={preview} alt={`preview ${i}`} className="h-12 w-12 rounded-lg object-cover shadow" />
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={createProduct} className="btn-primary w-full">🚀 List Product</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
              {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">{t('my_orders')}</h3>
          {orders.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <Package size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-xl text-gray-500">{t('no_orders_yet')}</p>
            </div>
          ) : (
            orders.map((order: any) => (
              <div key={order.id} className="glass-card p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-semibold">{order.product?.title || order.product_title}</p>
                  <p className="text-sm text-gray-500">${order.total_price} · {order.status}</p>
                </div>
                {order.status === 'paid' && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/marketplace/products/${order.id}/confirm_delivery/`);
                        toast.success(t('delivery_confirmed_escrow_released'));
                        fetchOrders();
                      } catch { toast.error(t('failed')); }
                    }}
                    className="btn-primary text-xs"
                  >
                    ✅ {t('confirm_delivery')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Shop Tab */}
      


      {/* Products */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={48} /></div>
      ) : error ? (
        <div className="glass-card p-12 rounded-2xl text-center"><AlertCircle className="mx-auto mb-3 text-red-500" size={48} /><p className="text-lg text-gray-600">{error}</p><button onClick={fetchProducts} className="btn-primary mt-4">Retry</button></div>
      ) : products.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center"><Package size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-xl text-gray-500">{t('no_products_found')}</p><p className="text-sm text-gray-400 mt-1">{t('try_adjusting_filters')}</p></div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p, idx) => (
                       <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -4 }}
                            onClick={async () => { 
                setSelectedProduct(p); setSelectedImageIndex(0);
                try { await api.post(`/marketplace/products/${p.id}/increment_view/`); } catch {}
              }}
              className="glass-card rounded-2xl overflow-hidden group cursor-pointer">
              <div className="h-48 bg-gray-100 overflow-hidden relative">
                {p.image_url ? (

                  
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={48} /></div>
                )}
                <motion.button whileTap={{ scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                  className={`absolute top-2 right-2 p-2 rounded-full shadow transition ${p.is_wishlisted ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'}`}>
                  <Heart size={16} className={p.is_wishlisted ? 'fill-white like-burst' : ''} />
                </motion.button>
                {wishlist.includes(p.id) && <span className="absolute top-2 right-12 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">❤️ {t('saved')}</span>}
                {p.stock <= 3 && p.stock > 0 && <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">Only {p.stock} {t('left')}</span>}
                {p.stock === 0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-bold text-lg">{t('sold_out')}</span></div>}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                <div className="flex items-center gap-1 mt-1">{p.average_rating ? renderStars(p.average_rating) : null}{p.review_count ? <span className="text-xs text-gray-400">({p.review_count})</span> : null}</div>
                <p className="text-xs text-gray-500 mt-1">by {p.seller_name}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-bold text-green-600"><DollarSign size={16} />{p.price}</span>
                                                     {p.seller_name === user?.username ? (
                    <span className="text-xs text-gray-400 italic">Your product</span>
                  ) : sentRequests.has(p.id) ? (
                    <span className="flex items-center gap-1 bg-gray-400 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                      <CheckCircle2 size={14} /> Sent
                    </span>
                  ) : (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); requestBuy(p.id); }} disabled={p.stock === 0} className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 transition disabled:opacity-50">
                      <ShoppingCart size={14} />Request to Buy
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
                    {products.map(p => (
            <div key={p.id} className="glass-card p-4 rounded-2xl flex gap-4 items-center cursor-pointer" onClick={async () => { 
              setSelectedProduct(p);
              try { await api.post(`/marketplace/products/${p.id}/increment_view/`); } catch {}
            }}>
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={24} /></div>}
              </div>
              <div className="flex-1"><h3 className="font-semibold">{p.title}</h3><p className="text-sm text-gray-500">by {p.seller_name} · {p.stock} {t('in_stock')}</p></div>
              <div className="text-right"><p className="text-xl font-bold text-green-600">${p.price}</p><button onClick={(e) => { e.stopPropagation(); requestBuy(p.id); }} disabled={p.stock === 0} className="btn-primary text-xs mt-1"> Request to Buy</button></div>
                        </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
         
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="relative h-64 bg-gray-100 rounded-t-2xl overflow-hidden">
              
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
  <div className="relative w-full h-full group">
    <img 
     src={(selectedProduct.images[selectedImageIndex]?.image_url || selectedProduct.image_url) ?? undefined} 
      alt={selectedProduct.title} 
      className="w-full h-full object-cover" 
    />
    {/* Download current image */}
    <a 
      href={(selectedProduct.images[selectedImageIndex]?.image_url || selectedProduct.image_url) ?? '#'}
      download
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-3 left-3 bg-white/90 rounded-full p-2 shadow opacity-0 group-hover:opacity-100 transition hover:bg-white"
      title={t('download_image')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </a>
    {/* Left/Right arrows for multiple images */}
    {selectedImageIndex > 0 && (
      <button onClick={() => setSelectedImageIndex(prev => prev - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 shadow hover:bg-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
    )}
    {selectedImageIndex < (selectedProduct.images?.length || 1) - 1 && (
      <button onClick={() => setSelectedImageIndex(prev => prev + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 shadow hover:bg-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    )}
    {selectedProduct.images.length > 1 && (
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {selectedProduct.images.map((_: any, i: number) => (
          <button 
            key={i}
            onClick={() => setSelectedImageIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === selectedImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
          />
        ))}
      </div>
    )}
  </div>
) : selectedProduct.image_url ? (
  <div className="relative w-full h-full group">
    <img src={selectedProduct.image_url} alt={selectedProduct.title} className="w-full h-full object-cover" />
    <a
      href={selectedProduct.image_url}
      download
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-3 left-3 bg-white/90 rounded-full p-2 shadow opacity-0 group-hover:opacity-100 transition hover:bg-white"
      title={t('download_image')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </a>
  </div>
) : (
  <div className="w-full h-full flex items-center justify-center"><Package size={64} className="text-gray-300" /></div>
)}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 bg-white rounded-full p-2 shadow"><X size={18} /></button>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold">{selectedProduct.title}</h2>
                <p className="text-gray-500 mt-1">{selectedProduct.description || 'No description'}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-3xl font-bold text-green-600"><DollarSign size={16} />{selectedProduct.price}</span>
                  <span className={`text-sm px-3 py-1 rounded-full ${selectedProduct.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedProduct.stock > 0 ? `${selectedProduct.stock} ${t('in_stock')}` : t('sold_out')}</span>
                                   </div>
                {/* Delete button for product owner */}
                 {user?.username === selectedProduct.seller_name && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete this product?')) {
                        try {
                          await api.delete(`/marketplace/products/${selectedProduct.id}/`);
                          toast.success('Product deleted');
                          setSelectedProduct(null);
                          fetchProducts();
                        } catch { toast.error('Delete failed'); }
                      }
                    }}
                    className="mt-3 w-full py-2 border border-red-300 text-red-500 rounded-xl text-sm hover:bg-red-50 transition"
                  >
                    🗑️ Delete Product
                  </button>
                )}
                                {/* Seller: Show pending orders */}
                {user?.username === selectedProduct.seller_name && pendingOrders.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <h4 className="font-semibold text-amber-800 text-sm mb-2">📦 Pending Orders ({pendingOrders.length})</h4>
                    {pendingOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between py-2 border-b border-amber-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{order.buyer_name || order.buyer_username || 'Buyer'}</p>
                          <p className="text-xs text-gray-500">Qty: {order.quantity} · ${order.total_price}</p>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.post(`/marketplace/products/${selectedProduct.id}/approve_purchase/`, { order_id: order.id });
                              toast.success('✅ Purchase approved! Payment received.');
                              setPendingOrders(prev => prev.filter(o => o.id !== order.id));
                              fetchProducts();
                            } catch (err: any) { toast.error(err.response?.data?.error || 'Approval failed'); }
                          }}
                          className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600"
                        >
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                             {/* Buyer: Show Request to Buy button (hide for seller) */}
                {user?.username !== selectedProduct.seller_name && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => requestBuy(selectedProduct.id)} disabled={selectedProduct.stock === 0 || sentRequests.has(selectedProduct.id)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <ShoppingCart size={18} /> {sentRequests.has(selectedProduct.id) ? '✓ Sent' : 'Request to Buy'}
                    </button>
                    <button onClick={() => toggleWishlist(selectedProduct.id)} className="btn-ghost"><Heart size={20} className={selectedProduct.is_wishlisted ? 'fill-red-500 text-red-500' : ''} /></button>
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t">
            <button
  onClick={() => setChatRoom(selectedProduct.id)}
  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-600 transition"
>
  <MessageCircle size={16} /> {t('chat_with_seller')}
</button>
                  <button
                    onClick={() => window.open(`tel:${selectedProduct.seller_phone || ''}`, '_self')}
                    className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-600 transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    {t('call_seller')}
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <button onClick={() => setShowReviews(!showReviews)} className="font-semibold text-sm flex items-center gap-1"><Star size={16} /> {t('reviews')} ({selectedProduct.review_count || 0})</button>
                  {showReviews && (
                    <div className="mt-2 space-y-2">
                      {selectedProduct.reviews?.map(r => (
                        <div key={r.id} className="bg-gray-50 p-3 rounded-xl"><div className="flex items-center gap-2"><span className="font-semibold text-sm">{r.reviewer_name}</span>{renderStars(r.rating)}</div><p className="text-sm text-gray-600">{r.comment}</p></div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">{[1,2,3,4,5].map(i => <button key={i} onClick={() => setReviewRating(i)}><Star size={18} className={i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} /></button>)}</div>
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

      {showPayment && (
        <PaymentModal amount={paymentAmount} type="purchase"
          onSuccess={() => { setShowPayment(false); fetchProducts(); toast.success('Payment successful!'); }}
          onClose={() => setShowPayment(false)} />
      )}
{chatRoom && (
  <MarketplaceChat roomId={chatRoom} onClose={() => setChatRoom(null)} />
)}
    </div>
  );
}

