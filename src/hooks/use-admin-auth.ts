import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AdminUser {
  id: string
  email: string
  full_name?: string
  role: 'super_admin' | 'admin'
}

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const authStatus = localStorage.getItem('adminAuth')
      const adminData = localStorage.getItem('adminUser')
      
      if (authStatus === 'authenticated' && adminData) {
        const user = JSON.parse(adminData)
        setAdminUser(user)
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        setAdminUser(null)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setIsAuthenticated(false)
      setAdminUser(null)
    }
    
    setIsLoading(false)
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Llamar a la función de Supabase para verificar credenciales
      const { data, error } = await supabase
        .rpc('verify_admin_password', {
          email_input: email,
          password_input: password
        })

      if (error) {
        console.error('Login error:', error)
        return { success: false, error: 'Error de conexión' }
      }

      if (data && data.length > 0) {
        const adminData = data[0]
        
        if (adminData.is_valid) {
          // Actualizar último login
          await supabase.rpc('update_admin_last_login', {
            admin_id_input: adminData.admin_id
          })

          const user: AdminUser = {
            id: adminData.admin_id,
            email: adminData.admin_email,
            full_name: adminData.admin_name,
            role: adminData.admin_role
          }

          // Guardar en localStorage
          localStorage.setItem('adminAuth', 'authenticated')
          localStorage.setItem('adminUser', JSON.stringify(user))
          
          setIsAuthenticated(true)
          setAdminUser(user)
          
          return { success: true }
        }
      }

      return { success: false, error: 'Email o contraseña incorrectos' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error inesperado durante el login' }
    }
  }

  const logout = () => {
    localStorage.removeItem('adminAuth')
    localStorage.removeItem('adminUser')
    setIsAuthenticated(false)
    setAdminUser(null)
  }

  const getAdminEmail = () => {
    return adminUser?.email || null
  }

  const getAdminUser = () => {
    return adminUser
  }

  const isSuperAdmin = () => {
    return adminUser?.role === 'super_admin'
  }

  return {
    isAuthenticated,
    isLoading,
    adminUser,
    login,
    logout,
    getAdminEmail,
    getAdminUser,
    isSuperAdmin,
    checkAuthStatus
  }
} 