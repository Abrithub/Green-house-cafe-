import axios from 'axios'
import { Bell, BellOff, ChefHat, Clock3, LogOut, RefreshCw } from 'lucide-react'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, createStaffClient, STAFF_TOKEN_KEY } from './api'
import './kitchen.css'

const TOKEN_KEY = STAFF_TOKEN_KEY
const POLL_MS = 5000

type OrderLine = {
  itemName: string
  quantity: number
  selectedCustomizations: string[]
  note?: string
}

type KitchenOrder = {
  orderId: string
  tableNumber: number | null
  tableLabel: string
  items: OrderLine[]
  notes: string
  total: number
  status: 'received' | 'preparing' | 'cooking' | 'ready' | 'served' | 'cancelled'
  createdAt: string
}

type StatusColumn = {
  status: KitchenOrder['status']
  label: string
  next?: KitchenOrder['status']
  nextLabel?: string
}

const COLUMNS: StatusColumn[] = [
  { status: 'received', label: 'New', next: 'preparing', nextLabel: 'Start preparing' },
  { status: 'preparing', label: 'Preparing', next: 'cooking', nextLabel: 'Send to cooking' },
  { status: 'cooking', label: 'Cooking', next: 'ready', nextLabel: 'Mark ready' },
  { status: 'ready', label: 'Ready', next: 'served', nextLabel: 'Served' },
]

function getClient() {
  return createStaffClient()
}

function formatAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours === 1 ? '1 hr ago' : `${hours} hr ago`
}

function playNewOrderChime() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.45)
    oscillator.onended = () => ctx.close()
  } catch {
    // Audio may be blocked until user interaction.
  }
}

export default function KitchenPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [soundOn, setSoundOn] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const knownOrderIds = useRef<Set<string>>(new Set())
  const hasLoadedOnce = useRef(false)

  const staffApi = useMemo(() => getClient(), [token])

  const loadOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) return

      if (!options?.silent) setLoading(true)
      setError('')

      try {
        const response = await staffApi.get<{ orders: KitchenOrder[] }>('/api/kitchen/orders')
        const nextOrders = response.data.orders

        if (hasLoadedOnce.current && soundOn) {
          const newIds = nextOrders
            .filter((order) => order.status === 'received' && !knownOrderIds.current.has(order.orderId))
            .map((order) => order.orderId)

          if (newIds.length > 0) {
            playNewOrderChime()
          }
        }

        knownOrderIds.current = new Set(nextOrders.map((order) => order.orderId))
        hasLoadedOnce.current = true
        setOrders(nextOrders)
        setLastUpdated(new Date())
      } catch (loadError) {
        if (axios.isAxiosError(loadError) && loadError.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        } else {
          setError('Could not load orders. Is MongoDB connected?')
        }
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [staffApi, soundOn, token],
  )

  useEffect(() => {
    if (!token) return undefined

    loadOrders()
    const interval = window.setInterval(() => loadOrders({ silent: true }), POLL_MS)
    return () => window.clearInterval(interval)
  }, [token, loadOrders])

  const ordersByStatus = useMemo(() => {
    const grouped = new Map<KitchenOrder['status'], KitchenOrder[]>()
    for (const column of COLUMNS) {
      grouped.set(column.status, [])
    }
    for (const order of orders) {
      const bucket = grouped.get(order.status)
      if (bucket) bucket.push(order)
    }
    return grouped
  }, [orders])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      const response = await api.post<{ token: string }>('/api/kitchen/login', { password })
      localStorage.setItem(TOKEN_KEY, response.data.token)
      setToken(response.data.token)
      setPassword('')
      knownOrderIds.current = new Set()
      hasLoadedOnce.current = false
    } catch {
      setLoginError('Wrong password. Check ADMIN_PASSWORD in server/.env')
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setOrders([])
    knownOrderIds.current = new Set()
    hasLoadedOnce.current = false
  }

  async function advanceStatus(order: KitchenOrder, nextStatus: KitchenOrder['status']) {
    setError('')
    try {
      const response = await staffApi.patch<{ order: KitchenOrder }>(`/api/kitchen/orders/${order.orderId}/status`, {
        status: nextStatus,
      })
      setOrders((current) =>
        nextStatus === 'served' || nextStatus === 'cancelled'
          ? current.filter((entry) => entry.orderId !== order.orderId)
          : current.map((entry) => (entry.orderId === order.orderId ? response.data.order : entry)),
      )
    } catch {
      setError(`Could not update order ${order.orderId}.`)
    }
  }

  if (!token) {
    return (
      <div className="kitchen-shell">
        <form className="kitchen-login" onSubmit={handleLogin}>
          <div className="kitchen-login-icon">
            <ChefHat size={30} />
          </div>
          <h1>Kitchen Display</h1>
          <p>See new orders and move them through prep to served.</p>
          <label>
            Staff password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Same as admin password"
              autoFocus
            />
          </label>
          {loginError ? <p className="kitchen-error">{loginError}</p> : null}
          <button type="submit" className="kitchen-btn kitchen-btn-primary">
            Open kitchen
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="kitchen-shell">
      <header className="kitchen-header">
        <div>
          <h1>
            <ChefHat size={28} />
            Kitchen
          </h1>
          <p>
            {orders.length} active order{orders.length === 1 ? '' : 's'}
            {lastUpdated ? ` · updated ${formatAgo(lastUpdated.toISOString())}` : ''}
          </p>
        </div>
        <div className="kitchen-header-actions">
          <button
            type="button"
            className="kitchen-btn kitchen-btn-ghost"
            onClick={() => setSoundOn((current) => !current)}
            title={soundOn ? 'Mute new-order sound' : 'Enable new-order sound'}
          >
            {soundOn ? <Bell size={16} /> : <BellOff size={16} />}
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" className="kitchen-btn kitchen-btn-ghost" onClick={() => loadOrders()}>
            <RefreshCw size={16} className={loading ? 'kitchen-spin' : ''} />
            Refresh
          </button>
          <button type="button" className="kitchen-btn kitchen-btn-ghost" onClick={handleLogout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </header>

      {error ? <p className="kitchen-error kitchen-banner">{error}</p> : null}

      <div className="kitchen-board">
        {COLUMNS.map((column) => {
          const columnOrders = ordersByStatus.get(column.status) ?? []
          return (
            <section key={column.status} className="kitchen-column">
              <div className="kitchen-column-head">
                <h2>{column.label}</h2>
                <span className="kitchen-count">{columnOrders.length}</span>
              </div>

              <div className="kitchen-column-body">
                {columnOrders.length === 0 ? (
                  <p className="kitchen-empty">No orders</p>
                ) : (
                  columnOrders.map((order) => (
                    <article key={order.orderId} className={`kitchen-card kitchen-card-${column.status}`}>
                      <div className="kitchen-card-top">
                        <div>
                          <strong className="kitchen-table">{order.tableLabel}</strong>
                          <span className="kitchen-order-id">{order.orderId}</span>
                        </div>
                        <span className="kitchen-time">
                          <Clock3 size={14} />
                          {formatAgo(order.createdAt)}
                        </span>
                      </div>

                      <ul className="kitchen-items">
                        {order.items.map((line, index) => (
                          <li key={`${order.orderId}-${index}`}>
                            <span className="kitchen-qty">{line.quantity}×</span>
                            <span>
                              {line.itemName}
                              {line.selectedCustomizations?.length ? (
                                <em> · {line.selectedCustomizations.join(', ')}</em>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {order.notes ? <p className="kitchen-notes">Note: {order.notes}</p> : null}

                      <div className="kitchen-card-actions">
                        {column.next ? (
                          <button
                            type="button"
                            className="kitchen-btn kitchen-btn-primary"
                            onClick={() => advanceStatus(order, column.next!)}
                          >
                            {column.nextLabel}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="kitchen-btn kitchen-btn-danger"
                          onClick={() => advanceStatus(order, 'cancelled')}
                        >
                          Cancel
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
