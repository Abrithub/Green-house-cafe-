import { AnimatePresence, motion } from 'framer-motion'
import { api, getApiErrorMessage } from './api'
import {
  ArrowLeft,
  Bell,
  Check,
  CircleUserRound,
  Clock3,
  Flame,
  Heart,
  Home,
  Languages,
  Leaf,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QrStandPage from './QrStandPage'
import AdminPage from './AdminPage'
import KitchenPage from './KitchenPage'
import './qr-stand.css'

type Category = {
  id: string
  name: string
  emoji: string
  image: string
}

type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  rating: number
  reviewCount: number
  image: string
  popular?: boolean
  featured?: boolean
  prepTime: string
  tags: string[]
  customizations: Array<{ label: string; price: number }>
}

type Combo = {
  id: string
  title: string
  subtitle: string
  image: string
}

type Promo = {
  id: string
  kicker: string
  title: string
  subtitle: string
  badge: string
}

type CartLine = {
  itemId: string
  quantity: number
  selectedCustomizations: string[]
  note: string
}

type OrderResponse = {
  orderId: string
  eta: string
}

type ApiPayload = {
  brand: {
    name: string
    tagline: string
    tableLabel: string
    heroMessage: string
    tableNumber?: number | null
  }
  categories: Category[]
  items: MenuItem[]
  combos: Combo[]
  promos?: Promo[]
}

// Keep the UI simple and match the restaurant price style (e.g. "400 birr").
const money = {
  format: (value: number) => `${Math.round(value)} birr`,
}

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
]

function App() {
  const location = useLocation()
  const isQrStand = location.pathname === '/qr-stand'
  const isAdmin = location.pathname.startsWith('/admin')
  const isKitchen = location.pathname.startsWith('/kitchen')

  if (isQrStand) {
    return (
      <Routes>
        <Route path="/qr-stand" element={<QrStandPage />} />
      </Routes>
    )
  }

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    )
  }

  if (isKitchen) {
    return (
      <Routes>
        <Route path="/kitchen" element={<KitchenPage />} />
      </Routes>
    )
  }

  return <MenuApp />
}

function MenuApp() {
  const [searchParams] = useSearchParams()
  const tableNumber = searchParams.get('table')
  const [data, setData] = useState<ApiPayload | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [language, setLanguage] = useState<'EN' | 'AM'>('EN')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    const loadData = async () => {
      const query = tableNumber ? `?table=${tableNumber}` : ''
      const response = await api.get<ApiPayload>(`/api/bootstrap${query}`)
      setData(response.data)
    }

    loadData().catch((error) => {
      console.error('Failed to load menu data', error)
    })
  }, [tableNumber])

  const itemMap = useMemo(() => {
    return new Map(data?.items.map((item) => [item.id, item]) ?? [])
  }, [data])

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0)

  const toggleFavorite = (itemId: string) => {
    setFavorites((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    )
  }

  const addToCart = (itemId: string, selectedCustomizations: string[] = [], note = '') => {
    setCart((current) => {
      const existingIndex = current.findIndex(
        (line) =>
          line.itemId === itemId &&
          line.note === note &&
          JSON.stringify(line.selectedCustomizations) === JSON.stringify(selectedCustomizations),
      )

      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }

      return [...current, { itemId, quantity: 1, selectedCustomizations, note }]
    })
  }

  const updateCartLine = (index: number, quantity: number) => {
    setCart((current) =>
      current
        .map((line, lineIndex) => (lineIndex === index ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  if (!data) {
    return (
      <div className="app-shell loading-shell">
        <div className="phone-frame">
          <div className="loading-state">
            <Leaf size={34} />
            <h1>Preparing the Green House menu</h1>
            <p>Loading the cafe experience...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <main className="screen-body">
          <AnimatedRoutes
            data={data}
            cart={cart}
            itemMap={itemMap}
            favorites={favorites}
            cartCount={cartCount}
            language={language}
            darkMode={darkMode}
            tableNumber={tableNumber ? Number(tableNumber) : null}
            addToCart={addToCart}
            updateCartLine={updateCartLine}
            toggleFavorite={toggleFavorite}
            setLanguage={setLanguage}
            setDarkMode={setDarkMode}
            setCart={setCart}
          />
        </main>

        <BottomNav cartCount={cartCount} />
      </div>
    </div>
  )
}

function AnimatedRoutes(props: {
  data: ApiPayload
  cart: CartLine[]
  itemMap: Map<string, MenuItem>
  favorites: string[]
  cartCount: number
  language: 'EN' | 'AM'
  darkMode: boolean
  tableNumber: number | null
  addToCart: (itemId: string, selectedCustomizations?: string[], note?: string) => void
  updateCartLine: (index: number, quantity: number) => void
  toggleFavorite: (itemId: string) => void
  setLanguage: (value: 'EN' | 'AM') => void
  setDarkMode: (value: boolean) => void
  setCart: (updater: CartLine[] | ((current: CartLine[]) => CartLine[])) => void
}) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={<HomeScreen {...props} />}
        />
        <Route
          path="/menu"
          element={<MenuScreen {...props} />}
        />
        <Route
          path="/product/:itemId"
          element={<ProductScreen {...props} />}
        />
        <Route
          path="/cart"
          element={<CartScreen {...props} />}
        />
        <Route
          path="/search"
          element={<SearchScreen {...props} />}
        />
        <Route
          path="/profile"
          element={<ProfileScreen {...props} />}
        />
        <Route
          path="/order-success/:orderId"
          element={<OrderSuccessScreen {...props} />}
        />
      </Routes>
    </AnimatePresence>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      className="page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.section>
  )
}

function HomeScreen({
  data,
  favorites,
  addToCart,
  toggleFavorite,
}: {
  data: ApiPayload
  favorites: string[]
  addToCart: (itemId: string) => void
  toggleFavorite: (itemId: string) => void
}) {
  const featured = data.items.filter((item) => item.featured || item.popular).slice(0, 5)
  const homeCategories = data.categories.slice(0, 8)
  const navigate = useNavigate()
  const [promoIndex, setPromoIndex] = useState(0)

  useEffect(() => {
    if (!data.promos?.length) return undefined
    const timer = window.setInterval(() => {
      setPromoIndex((current) => (current + 1) % data.promos!.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [data.promos])

  const activePromo = data.promos?.[promoIndex] ?? data.promos?.[0]

  return (
    <Page>
      <div className="hero-panel home-hero">
        <p className="eyebrow home-table">{data.brand.tableLabel}</p>

        <div className="brand-row">
          <div className="brand-lockup">
            <div className="brand-leaf">
              <Leaf size={18} strokeWidth={2.2} />
            </div>
            <h1>{data.brand.name}</h1>
          </div>
          <div className="hero-actions">
            <button type="button" className="lang-chip" aria-label="Switch language">
              አማ
            </button>
            <button type="button" className="icon-button" aria-label="Notifications">
              <Bell size={16} />
            </button>
          </div>
        </div>

        <button type="button" className="search-strip" onClick={() => navigate('/search')}>
          <Search size={18} />
          <span>Search burgers, pizza, coffee...</span>
        </button>

        {activePromo ? (
          <div className="promo-banner">
            <div>
              <p className="promo-kicker">{activePromo.kicker}</p>
              <h2>{activePromo.title}</h2>
              <span>{activePromo.subtitle}</span>
            </div>
            <div className="promo-chip">{activePromo.badge}</div>
            <div className="promo-dots">
              {data.promos?.map((promo, index) => (
                <button
                  key={promo.id}
                  type="button"
                  className={`promo-dot ${index === promoIndex ? 'active' : ''}`}
                  onClick={() => setPromoIndex(index)}
                  aria-label={`Show promo ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="home-content">
        <section className="section-block">
          <div className="section-heading">
            <h3>Categories</h3>
            <Link to="/menu" className="see-all">
              See all <span aria-hidden>›</span>
            </Link>
          </div>
          <div className="category-grid">
            {homeCategories.map((category) => (
              <Link key={category.id} to={`/menu?category=${category.id}`} className="category-card">
                <div className="category-image-wrap">
                  <img src={category.image} alt={category.name} loading="lazy" />
                </div>
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <h3 className="popular-title">
              <Flame size={18} className="popular-flame" />
              Most Popular
            </h3>
            <Link to="/menu" className="see-all">
              See all <span aria-hidden>›</span>
            </Link>
          </div>
          <div className="vertical-list">
            {featured.map((item) => (
              <MenuRow
                key={item.id}
                item={item}
                favorite={favorites.includes(item.id)}
                onFavorite={() => toggleFavorite(item.id)}
                onAdd={() => addToCart(item.id)}
              />
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <h3>Recommended Combos</h3>
          </div>
          <div className="combo-list">
            {data.combos.map((combo) => (
              <article key={combo.id} className="combo-card">
                <img src={combo.image} alt={combo.title} className="combo-image" loading="lazy" />
                <div className="combo-copy">
                  <Flame size={16} className="popular-flame" />
                  <strong>{combo.title}</strong>
                  <span>{combo.subtitle}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}

function MenuScreen({
  data,
  favorites,
  addToCart,
  toggleFavorite,
}: {
  data: ApiPayload
  favorites: string[]
  addToCart: (itemId: string) => void
  toggleFavorite: (itemId: string) => void
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') ?? data.categories[0]?.id ?? ''
  const [activeCategory, setActiveCategory] = useState(initialCategory)

  useEffect(() => {
    const fromUrl = searchParams.get('category')
    if (fromUrl) setActiveCategory(fromUrl)
  }, [searchParams])

  const items = data.items.filter((item) => item.categoryId === activeCategory)
  const currentCategory = data.categories.find((category) => category.id === activeCategory)

  return (
    <Page>
      <div className="hero-panel compact menu-hero-panel">
        <div className="top-nav-row">
          <button type="button" className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h2>Our Menu</h2>
          <button type="button" className="icon-button" aria-label="Filter">
            <Sparkles size={18} />
          </button>
        </div>

        <div className="chip-row">
          {data.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`chip ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span>{category.emoji}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {currentCategory ? (
        <div className="menu-hero">
          <img src={currentCategory.image} alt={currentCategory.name} />
          <div className="menu-hero-overlay">
            <span>Category</span>
            <h3>{currentCategory.name}</h3>
            <p>{items.length} items available</p>
          </div>
        </div>
      ) : null}

      <div className="menu-grid">
        {items.map((item) => (
          <article key={item.id} className="menu-tile">
            <div className="menu-image-wrap">
              <Link to={`/product/${item.id}`} className="menu-image-link">
                <img src={item.image} alt={item.name} loading="lazy" />
              </Link>
              {item.popular ? <span className="badge hot menu-popular-badge">🔥 Popular</span> : null}
              <button
                type="button"
                className="wish-button menu-wish"
                onClick={() => toggleFavorite(item.id)}
                aria-label="Add to favorites"
              >
                <Heart size={15} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className="menu-tile-content">
              <Link to={`/product/${item.id}`} className="menu-title-link">
                <strong>{item.name}</strong>
              </Link>
              <p>{item.description}</p>
              <div className="menu-rating">
                <Star size={13} fill="#f5b301" stroke="#f5b301" />
                {item.rating} ({item.reviewCount})
              </div>
              <div className="menu-tile-footer">
                <span className="price-green">{money.format(item.price)}</span>
                <button type="button" className="plus-button" onClick={() => addToCart(item.id)} aria-label="Add to cart">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Page>
  )
}

function ProductScreen({
  data,
  addToCart,
}: {
  data: ApiPayload
  addToCart: (itemId: string, selectedCustomizations?: string[], note?: string) => void
}) {
  const navigate = useNavigate()
  const { itemId } = useParams()
  const item = data.items.find((entry) => entry.id === itemId) ?? data.items[0]
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const customizationTotal = item.customizations
    .filter((option) => selectedCustomizations.includes(option.label))
    .reduce((sum, option) => sum + option.price, 0)

  const total = (item.price + customizationTotal) * quantity

  const toggleCustomization = (label: string) => {
    setSelectedCustomizations((current) =>
      current.includes(label) ? current.filter((entry) => entry !== label) : [...current, label],
    )
  }

  const handleAdd = () => {
    for (let index = 0; index < quantity; index += 1) {
      addToCart(item.id, selectedCustomizations)
    }
    setAdded(true)
    window.setTimeout(() => {
      setAdded(false)
      navigate('/cart')
    }, 800)
  }

  return (
    <Page>
      <div className="detail-photo-wrap">
        <img src={item.image} alt={item.name} className="detail-photo" />
        <button className="floating-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-heading">
          <div>
            <p className="eyebrow">Fresh Kitchen Favorite</p>
            <h2>{item.name}</h2>
          </div>
          <strong>{money.format(item.price)}</strong>
        </div>

        <p className="detail-description">{item.description}</p>

        <div className="tag-row">
          {item.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>

        <div className="meta-row">
          <span><Star size={14} /> {item.rating}</span>
          <span><Clock3 size={14} /> {item.prepTime}</span>
        </div>

        <section className="detail-section">
          <h3>Customizations</h3>
          <div className="option-list">
            {item.customizations.map((option) => (
              <label key={option.label} className="option-item">
                <input
                  type="checkbox"
                  checked={selectedCustomizations.includes(option.label)}
                  onChange={() => toggleCustomization(option.label)}
                />
                <span>{option.label}</span>
                <strong>+{money.format(option.price)}</strong>
              </label>
            ))}
          </div>
        </section>

        <div className="detail-footer">
          <div className="quantity-stepper">
            <button onClick={() => setQuantity((count) => Math.max(1, count - 1))}>
              <Minus size={16} />
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((count) => count + 1)}>
              <Plus size={16} />
            </button>
          </div>

          <button className={`primary-button ${added ? 'success' : ''}`} onClick={handleAdd}>
            {added ? <Check size={18} /> : null}
            {added ? 'Added!' : `Add to Cart ${money.format(total)}`}
          </button>
        </div>
      </div>
    </Page>
  )
}

function CartScreen({
  cart,
  itemMap,
  updateCartLine,
  setCart,
  tableNumber,
}: {
  cart: CartLine[]
  itemMap: Map<string, MenuItem>
  updateCartLine: (index: number, quantity: number) => void
  setCart: (updater: CartLine[] | ((current: CartLine[]) => CartLine[])) => void
  tableNumber: number | null
}) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const subtotal = cart.reduce((sum, line) => {
    const item = itemMap.get(line.itemId)
    if (!item) return sum
    const extras = item.customizations
      .filter((option) => line.selectedCustomizations.includes(option.label))
      .reduce((extraSum, option) => extraSum + option.price, 0)
    return sum + (item.price + extras) * line.quantity
  }, 0)

  const tax = subtotal * 0.15
  const service = subtotal * 0.08
  const total = subtotal + tax + service

  const [checkoutError, setCheckoutError] = useState('')

  const handleCheckout = async () => {
    setSubmitting(true)
    setCheckoutError('')
    try {
      const response = await api.post<OrderResponse>('/api/orders', {
        items: cart,
        notes,
        tableNumber,
      })
      setCart([])
      navigate(`/order-success/${response.data.orderId}`)
    } catch (error) {
      setCheckoutError(getApiErrorMessage(error, 'Could not place order. Is the server running?'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page>
      <div className="simple-header">
        <h2>Your Cart</h2>
        <p>Review your items before placing the order.</p>
      </div>

      <div className="cart-list">
        {cart.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={34} />
            <h3>Your cart is empty</h3>
            <p>Add some fresh Green House favorites to get started.</p>
            <Link to="/menu" className="primary-button">Browse Menu</Link>
          </div>
        ) : (
          cart.map((line, index) => {
            const item = itemMap.get(line.itemId)
            if (!item) return null
            return (
              <article key={`${line.itemId}-${index}`} className="cart-card">
                <img src={item.image} alt={item.name} />
                <div className="cart-card-content">
                  <strong>{item.name}</strong>
                  <p>{line.selectedCustomizations.join(', ') || 'Chef standard preparation'}</p>
                  <span>{money.format(item.price * line.quantity)}</span>
                </div>
                <div className="mini-stepper">
                  <button onClick={() => updateCartLine(index, line.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <span>{line.quantity}</span>
                  <button onClick={() => updateCartLine(index, line.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>

      {cart.length > 0 ? (
        <>
          <section className="notes-panel">
            <h3>Order notes</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Special instructions, spice level, or allergy notes..."
            />
          </section>

          <section className="bill-panel">
            <div><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
            <div><span>Tax</span><strong>{money.format(tax)}</strong></div>
            <div><span>Service charge</span><strong>{money.format(service)}</strong></div>
            <div className="bill-total"><span>Total</span><strong>{money.format(total)}</strong></div>
          </section>

          {checkoutError ? <p className="checkout-error">{checkoutError}</p> : null}

          <button className="primary-button checkout" onClick={handleCheckout} disabled={submitting}>
            {submitting ? 'Placing order...' : 'Place Order'}
          </button>
        </>
      ) : null}
    </Page>
  )
}

function SearchScreen({
  data,
  favorites,
  addToCart,
  toggleFavorite,
}: {
  data: ApiPayload
  favorites: string[]
  addToCart: (itemId: string) => void
  toggleFavorite: (itemId: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = data.items.filter((item) => {
    const searchTarget = `${item.name} ${item.description} ${item.tags.join(' ')}`
    return searchTarget.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <Page>
      <div className="simple-header">
        <h2>Smart Search</h2>
        <p>Find burgers, coffee, desserts, and more in seconds.</p>
      </div>

      <div className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Green House menu..." />
      </div>

      <div className="quick-tags">
        {['Burger', 'Pizza', 'Coffee', 'Juice', 'Dessert'].map((tag) => (
          <button key={tag} className="tag-pill" onClick={() => setQuery(tag)}>{tag}</button>
        ))}
      </div>

      <div className="vertical-list">
        {filtered.map((item) => (
          <MenuRow
            key={item.id}
            item={item}
            favorite={favorites.includes(item.id)}
            onFavorite={() => toggleFavorite(item.id)}
            onAdd={() => addToCart(item.id)}
          />
        ))}
      </div>
    </Page>
  )
}

function ProfileScreen({
  data,
  favorites,
  itemMap,
  language,
  darkMode,
  setLanguage,
  setDarkMode,
}: {
  data: ApiPayload
  favorites: string[]
  itemMap: Map<string, MenuItem>
  language: 'EN' | 'AM'
  darkMode: boolean
  setLanguage: (value: 'EN' | 'AM') => void
  setDarkMode: (value: boolean) => void
}) {
  return (
    <Page>
      <div className="profile-hero">
        <div className="leaf-logo"><Leaf size={20} /></div>
        <h2>{data.brand.name}</h2>
        <p>{data.brand.tagline}</p>
      </div>

      <section className="settings-card">
        <div className="setting-row">
          <div>
            <strong>Language</strong>
            <span>Switch between English and Amharic</span>
          </div>
          <div className="segmented">
            <button
              className={language === 'EN' ? 'active' : ''}
              onClick={() => setLanguage('EN')}
            >
              <Languages size={14} /> EN
            </button>
            <button
              className={language === 'AM' ? 'active' : ''}
              onClick={() => setLanguage('AM')}
            >
              AM
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <strong>Dark Mode</strong>
            <span>Use a deep green nighttime dining theme</span>
          </div>
          <button className={`toggle ${darkMode ? 'on' : ''}`} onClick={() => setDarkMode(!darkMode)}>
            <span />
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h3>Saved Favorites</h3>
        </div>
        <div className="favorites-list">
          {favorites.length === 0 ? (
            <p className="muted">Tap the heart icon on any meal to save it here.</p>
          ) : (
            favorites.map((id) => {
              const item = itemMap.get(id)
              return item ? (
                <div key={id} className="favorite-pill">
                  <img src={item.image} alt={item.name} />
                  <span>{item.name}</span>
                </div>
              ) : null
            })
          )}
        </div>
      </section>
    </Page>
  )
}

function OrderSuccessScreen({ cartCount }: { cartCount: number }) {
  const { orderId } = useParams()

  return (
    <Page>
      <div className="success-state">
        <motion.div
          className="success-check"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180 }}
        >
          <Check size={34} />
        </motion.div>
        <h2>Your order has been successfully placed.</h2>
        <p>Order number: <strong>{orderId}</strong></p>
        <div className="progress-steps">
          {['Received', 'Preparing', 'Cooking', 'Ready'].map((step, index) => (
            <div key={step} className={`progress-step ${index === 0 ? 'active' : ''}`}>
              <span>{index + 1}</span>
              {step}
            </div>
          ))}
        </div>
        <Link to="/" className="primary-button">
          Continue Browsing {cartCount > 0 ? `(${cartCount})` : ''}
        </Link>
      </div>
    </Page>
  )
}

function MenuRow({
  item,
  favorite,
  onFavorite,
  onAdd,
}: {
  item: MenuItem
  favorite: boolean
  onFavorite: () => void
  onAdd: () => void
}) {
  return (
    <article className="food-row">
      <Link to={`/product/${item.id}`} className="food-row-image-link">
        <img src={item.image} alt={item.name} loading="lazy" />
      </Link>
      <div className="food-row-content">
        <div className="food-row-top">
          <div>
            <Link to={`/product/${item.id}`} className="food-row-title">
              <strong>{item.name}</strong>
            </Link>
            <p>{item.description}</p>
          </div>
          <button type="button" className="wish-button" onClick={onFavorite} aria-label="Add to favorites">
            <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="food-row-bottom">
          <span className="rating-pill">
            <Star size={14} fill="#f5b301" stroke="#f5b301" />
            {item.rating} ({item.reviewCount})
          </span>
          <div className="food-row-actions">
            <strong className="price-green">{money.format(item.price)}</strong>
            <button type="button" className="plus-button" onClick={onAdd} aria-label="Add to cart">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function BottomNav({ cartCount }: { cartCount: number }) {
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

        return (
          <Link key={item.to} to={item.to} className={`nav-link ${active ? 'active' : ''}`}>
            <div className="nav-icon-wrap">
              <Icon size={18} />
              {item.to === '/cart' && cartCount > 0 ? <span className="nav-badge">{cartCount}</span> : null}
            </div>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default App
