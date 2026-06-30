import axios from 'axios'
import { Lock, LogOut, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, createStaffClient, getApiErrorMessage, STAFF_TOKEN_KEY } from './api'
import './admin.css'

const TOKEN_KEY = STAFF_TOKEN_KEY

type Category = {
  slug: string
  name: string
  nameAm: string
  emoji: string
  image: string
  sortOrder: number
  active: boolean
}

type Customization = {
  label: string
  labelAm: string
  price: number
}

type MenuItem = {
  slug: string
  categorySlug: string
  name: string
  nameAm: string
  description: string
  descriptionAm: string
  price: number
  image: string
  prepTime: string
  tags: string[]
  customizations: Customization[]
  popular: boolean
  featured: boolean
  active: boolean
}

const emptyItem = (categorySlug: string): MenuItem => ({
  slug: '',
  categorySlug,
  name: '',
  nameAm: '',
  description: '',
  descriptionAm: '',
  price: 0,
  image: '',
  prepTime: '12 min',
  tags: [],
  customizations: [],
  popular: false,
  featured: false,
  active: true,
})

function getClient() {
  return createStaffClient()
}

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const staffApi = useMemo(() => getClient(), [token])

  const loadData = useCallback(async () => {
    setLoading(true)
    setSaveError('')
    try {
      const [catRes, menuRes] = await Promise.all([
        staffApi.get<{ categories: Category[] }>('/api/admin/categories'),
        staffApi.get<{ items: MenuItem[] }>('/api/admin/menu'),
      ])
      setCategories(catRes.data.categories)
      setItems(menuRes.data.items)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      } else {
        setSaveError('Could not load admin data. Is MongoDB connected?')
      }
    } finally {
      setLoading(false)
    }
  }, [staffApi])

  useEffect(() => {
    if (token) loadData()
  }, [token, loadData])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      if (filterCategory !== 'all' && item.categorySlug !== filterCategory) return false
      if (!query) return true
      return (
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    })
  }, [items, filterCategory, search])

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      const response = await api.post<{ token: string }>('/api/admin/login', { password })
      localStorage.setItem(TOKEN_KEY, response.data.token)
      setToken(response.data.token)
      setPassword('')
    } catch {
      setLoginError('Wrong password. Check ADMIN_PASSWORD in server/.env')
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setEditing(null)
  }

  function openNewItem() {
    const defaultCategory = categories.find((c) => c.active)?.slug ?? categories[0]?.slug ?? ''
    setEditing(emptyItem(defaultCategory))
    setIsNew(true)
    setSaveMessage('')
    setSaveError('')
  }

  function openEditItem(item: MenuItem) {
    setEditing({ ...item, customizations: item.customizations.map((c) => ({ ...c })) })
    setIsNew(false)
    setSaveMessage('')
    setSaveError('')
  }

  function closeEditor() {
    setEditing(null)
    setIsNew(false)
  }

  function updateEditing<K extends keyof MenuItem>(key: K, value: MenuItem[K]) {
    setEditing((current) => (current ? { ...current, [key]: value } : current))
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!editing) return

    setSaveMessage('')
    setSaveError('')

    const payload = {
      ...editing,
      tags: editing.tags.filter(Boolean),
      customizations: editing.customizations
        .filter((entry) => entry.label.trim())
        .map((entry) => ({
          label: entry.label.trim(),
          labelAm: entry.labelAm.trim(),
          price: Number(entry.price) || 0,
        })),
    }

    try {
      if (isNew) {
        const response = await staffApi.post<{ item: MenuItem }>('/api/admin/menu', payload)
        setItems((current) => [...current, response.data.item])
        setSaveMessage(`Added "${response.data.item.name}"`)
        closeEditor()
      } else {
        const response = await staffApi.patch<{ item: MenuItem }>(`/api/admin/menu/${editing.slug}`, payload)
        setItems((current) => current.map((item) => (item.slug === editing.slug ? response.data.item : item)))
        setSaveMessage(`Saved "${response.data.item.name}"`)
        closeEditor()
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Save failed.')
      setSaveError(message)
    }
  }

  async function handleHide(item: MenuItem) {
    if (!window.confirm(`Hide "${item.name}" from the customer menu?`)) return

    try {
      const response = await staffApi.delete<{ item: MenuItem }>(`/api/admin/menu/${item.slug}`)
      setItems((current) => current.map((entry) => (entry.slug === item.slug ? response.data.item : entry)))
      if (editing?.slug === item.slug) closeEditor()
    } catch {
      setSaveError('Could not hide item.')
    }
  }

  async function quickPriceSave(item: MenuItem, price: number) {
    try {
      const response = await staffApi.patch<{ item: MenuItem }>(`/api/admin/menu/${item.slug}`, { price })
      setItems((current) => current.map((entry) => (entry.slug === item.slug ? response.data.item : entry)))
    } catch {
      setSaveError(`Could not update price for ${item.name}.`)
    }
  }

  if (!token) {
    return (
      <div className="admin-shell">
        <form className="admin-login" onSubmit={handleLogin}>
          <div className="admin-login-icon">
            <Lock size={28} />
          </div>
          <h1>Green House Admin</h1>
          <p>Edit menu items and prices without touching code.</p>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin password"
              autoFocus
            />
          </label>
          {loginError ? <p className="admin-error">{loginError}</p> : null}
          <button type="submit" className="admin-btn admin-btn-primary">
            Sign in
          </button>
          <p className="admin-hint">Default: <code>greenhouse</code> — set <code>ADMIN_PASSWORD</code> in server/.env</p>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <h1>Menu Admin</h1>
          <p>Changes save to MongoDB and appear on the customer menu immediately.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={handleLogout}>
          <LogOut size={16} />
          Log out
        </button>
      </header>

      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="Search items..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="admin-search"
        />
        <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.emoji} {category.name}
            </option>
          ))}
        </select>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewItem}>
          <Plus size={16} />
          Add item
        </button>
      </div>

      {saveMessage ? <p className="admin-success">{saveMessage}</p> : null}
      {saveError ? <p className="admin-error">{saveError}</p> : null}

      <div className="admin-layout">
        <section className="admin-table-wrap">
          {loading ? <p className="admin-muted">Loading menu...</p> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Price (birr)</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.slug} className={item.active ? '' : 'admin-row-hidden'}>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="admin-slug">{item.slug}</span>
                  </td>
                  <td>{categoryMap.get(item.categorySlug)?.name ?? item.categorySlug}</td>
                  <td>
                    <input
                      type="number"
                      className="admin-price-input"
                      defaultValue={item.price}
                      min={0}
                      step={1}
                      onBlur={(event) => {
                        const next = Number(event.target.value)
                        if (Number.isFinite(next) && next !== item.price) {
                          quickPriceSave(item, next)
                        }
                      }}
                    />
                  </td>
                  <td>
                    <span className={item.active ? 'admin-badge admin-badge-live' : 'admin-badge'}>
                      {item.active ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td className="admin-actions">
                    <button type="button" className="admin-icon-btn" onClick={() => openEditItem(item)} title="Edit">
                      <Pencil size={16} />
                    </button>
                    {item.active ? (
                      <button type="button" className="admin-icon-btn" onClick={() => handleHide(item)} title="Hide">
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredItems.length === 0 ? (
            <p className="admin-muted">No items match your filters.</p>
          ) : null}
        </section>

        {editing ? (
          <aside className="admin-editor">
            <div className="admin-editor-header">
              <h2>{isNew ? 'New menu item' : 'Edit item'}</h2>
              <button type="button" className="admin-icon-btn" onClick={closeEditor}>
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSave}>
              <label>
                Name
                <input
                  value={editing.name}
                  onChange={(event) => updateEditing('name', event.target.value)}
                  required
                />
              </label>

              <label>
                Name (Amharic)
                <input
                  value={editing.nameAm}
                  onChange={(event) => updateEditing('nameAm', event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label>
                Category
                <select
                  value={editing.categorySlug}
                  onChange={(event) => updateEditing('categorySlug', event.target.value)}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Price (birr)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editing.price}
                  onChange={(event) => updateEditing('price', Number(event.target.value))}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={editing.description}
                  onChange={(event) => updateEditing('description', event.target.value)}
                />
              </label>

              <label>
                Image URL
                <input
                  value={editing.image}
                  onChange={(event) => updateEditing('image', event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label>
                Prep time
                <input
                  value={editing.prepTime}
                  onChange={(event) => updateEditing('prepTime', event.target.value)}
                />
              </label>

              <label>
                Tags (comma separated)
                <input
                  value={editing.tags.join(', ')}
                  onChange={(event) =>
                    updateEditing(
                      'tags',
                      event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                    )
                  }
                />
              </label>

              <fieldset className="admin-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={editing.popular}
                    onChange={(event) => updateEditing('popular', event.target.checked)}
                  />
                  Popular
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editing.featured}
                    onChange={(event) => updateEditing('featured', event.target.checked)}
                  />
                  Featured
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(event) => updateEditing('active', event.target.checked)}
                  />
                  Visible on menu
                </label>
              </fieldset>

              <div className="admin-customizations">
                <div className="admin-customizations-head">
                  <h3>Customizations</h3>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() =>
                      updateEditing('customizations', [
                        ...editing.customizations,
                        { label: '', labelAm: '', price: 0 },
                      ])
                    }
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                {editing.customizations.map((entry, index) => (
                  <div key={index} className="admin-custom-row">
                    <input
                      placeholder="Label"
                      value={entry.label}
                      onChange={(event) => {
                        const next = [...editing.customizations]
                        next[index] = { ...next[index], label: event.target.value }
                        updateEditing('customizations', next)
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={entry.price}
                      min={0}
                      onChange={(event) => {
                        const next = [...editing.customizations]
                        next[index] = { ...next[index], price: Number(event.target.value) }
                        updateEditing('customizations', next)
                      }}
                    />
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() =>
                        updateEditing(
                          'customizations',
                          editing.customizations.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {saveError ? <p className="admin-error">{saveError}</p> : null}

              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary">
                  <Save size={16} />
                  {isNew ? 'Create item' : 'Save changes'}
                </button>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={closeEditor}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
