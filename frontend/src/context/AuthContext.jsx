import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const M_TOKEN = 'mechmate_token'
const M_NAME  = 'mechmate_name'
const C_TOKEN = 'customer_token'
const C_DATA  = 'customer_data'

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(() => localStorage.getItem(M_TOKEN) || null)
  const [mechanicName, setName] = useState(() => localStorage.getItem(M_NAME)  || '')

  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem(C_TOKEN) || null)
  const [customerData, setCustomerData]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(C_DATA) || 'null') } catch { return null }
  })

  // Mechanic auth
  const login = useCallback((tok, name) => {
    localStorage.setItem(M_TOKEN, tok)
    localStorage.setItem(M_NAME, name || '')
    setToken(tok)
    setName(name || '')
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(M_TOKEN)
    localStorage.removeItem(M_NAME)
    setToken(null)
    setName('')
  }, [])

  // Customer auth
  const customerLogin = useCallback((tok, data) => {
    localStorage.setItem(C_TOKEN, tok)
    localStorage.setItem(C_DATA, JSON.stringify(data))
    setCustomerToken(tok)
    setCustomerData(data)
  }, [])

  const customerLogout = useCallback(() => {
    localStorage.removeItem(C_TOKEN)
    localStorage.removeItem(C_DATA)
    setCustomerToken(null)
    setCustomerData(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      // Mechanic
      token, mechanicName, login, logout, isAuthenticated: !!token,
      // Customer
      customerToken, customerData, customerLogin, customerLogout,
      isCustomerAuthenticated: !!customerToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
