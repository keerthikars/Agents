import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach mechanic JWT on every request (if present)
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mechmate_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Customer API — separate instance that attaches customer JWT
const capi = axios.create({ baseURL: '/api' })
capi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('customer_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const mechanicLogin      = (username, password) => api.post('/auth/mechanic/login', { username, password })
export const customerRegister   = (data) => api.post('/auth/customer/register', data)
export const customerAuthLogin  = (phone, password) => api.post('/auth/customer/login', { phone, password })
export const customerMe         = () => capi.get('/auth/customer/me')
export const lookupTrackingId   = (trackingId) => api.get(`/track/${trackingId}`)

// ── Workflow ──────────────────────────────────────────────────────────────────
export const startWorkflow      = (data) => api.post('/workflow/start', data)
export const getWorkflowHistory = (skip = 0, limit = 20) => api.get(`/workflow/history?skip=${skip}&limit=${limit}`)
export const getWorkflow        = (id) => api.get(`/workflow/${id}`)
export const getWorkflowOutputs = (id) => api.get(`/workflow/${id}/outputs`)
export const deleteWorkflow     = (workflowId) => api.delete(`/workflow/${workflowId}`)
export const getCustomers       = (skip = 0, limit = 50, search = '') => api.get(`/customers?skip=${skip}&limit=${limit}&search=${search}`)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/dashboard/stats')

// ── Repairs ───────────────────────────────────────────────────────────────────
export const getRepairs         = (skip = 0, limit = 20) => api.get(`/repairs?skip=${skip}&limit=${limit}`)
export const getRepair          = (id) => api.get(`/repairs/${id}`)
export const deleteRepair       = (repairId) => api.delete(`/repairs/${repairId}`)
export const completeRepair     = (repairId) => api.post(`/repairs/${repairId}/complete`)
export const updateRepairStatus = (repairId, status) => api.patch(`/repairs/${repairId}/status`, { repair_status: status })
export const getRepairStatus    = (repairId) => api.get(`/repairs/${repairId}/status`)

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = (repairId = null) =>
  api.get(`/notifications${repairId ? `?repair_id=${repairId}` : ''}`)

// ── Diagnosis Agent ───────────────────────────────────────────────────────────
export const getDiagnosisContext = (appointmentId) => api.get(`/diagnosis/appointment/${appointmentId}`)
export const runDiagnosis        = (data) => api.post('/diagnosis/run', data)
export const getDiagnosis        = (repairId) => api.get(`/diagnosis/${repairId}`)

// ── Inventory ─────────────────────────────────────────────────────────────────
export const getInventoryParts  = () => api.get('/inventory/parts')
export const addStock           = (data) => api.post('/inventory/add-stock', data)
export const updatePart         = (id, data) => api.put(`/inventory/parts/${id}`, data)
export const deletePart         = (id) => api.delete(`/inventory/parts/${id}`)
export const adjustQuantity     = (id, delta) => api.patch(`/inventory/parts/${id}/quantity`, { delta })
export const getLowStock        = () => api.get('/inventory/low-stock')
export const getInventoryResult = (repairId) => api.get(`/inventory/result/${repairId}`)
export const checkInventory     = (repairId) => api.post(`/inventory/check/${repairId}`)

// ── Billing / Payment ─────────────────────────────────────────────────────────
export const recordPayment = (repairId, paymentMethod) =>
  api.post(`/billing/${repairId}/pay`, { payment_method: paymentMethod })
export const markCashPaid  = (repairId) =>
  api.post(`/billing/${repairId}/mark-cash-paid`)

// ── Chat ──────────────────────────────────────────────────────────────────────
export const getChat  = (repairId) => api.get(`/chat/${repairId}`)
export const sendChat = (repairId, sender, senderName, message) =>
  api.post('/chat', { repair_id: repairId, sender, sender_name: senderName, message })

// ── Service Requests ──────────────────────────────────────────────────────────
export const createServiceRequest    = (data) => api.post('/service-requests', data)
export const getServiceRequests      = (status = null) => api.get(`/service-requests${status ? `?status=${status}` : ''}`)
export const acceptServiceRequest    = (id) => api.post(`/service-requests/${id}/accept`)
export const rejectServiceRequest    = (id) => api.post(`/service-requests/${id}/reject`)
export const checkPhoneRequests      = (phone) => api.get(`/service-requests/check-phone/${phone}`)
export const getCustomerServiceReqs  = () => capi.get('/customer/service-requests')
export const getCustomerAppointments = () => capi.get('/customer/appointments')
export const getCustomerRepairs      = () => capi.get('/customer/repairs')

// ── Appointments ──────────────────────────────────────────────────────────────
export const scheduleAppointment      = (data) => api.post('/appointments', data)
export const getAppointments          = (status = null) => api.get(`/appointments${status ? `?status=${status}` : ''}`)
export const getAppointment           = (id) => api.get(`/appointments/${id}`)
export const getAppointmentByTracking = (trackingId) => api.get(`/appointments/by-tracking/${trackingId}`)
export const getAppointmentsByPhone   = (phone) => api.get(`/appointments/by-phone/${phone}`)
export const confirmAppointment       = (id) => api.post(`/appointments/${id}/confirm`)
export const requestReschedule        = (id, data) => api.post(`/appointments/${id}/reschedule-request`, data)
export const approveReschedule        = (id) => api.post(`/appointments/${id}/approve-reschedule`)
export const rejectReschedule         = (id) => api.post(`/appointments/${id}/reject-reschedule`)
export const markBikeReceived         = (id) => api.post(`/appointments/${id}/bike-received`)
