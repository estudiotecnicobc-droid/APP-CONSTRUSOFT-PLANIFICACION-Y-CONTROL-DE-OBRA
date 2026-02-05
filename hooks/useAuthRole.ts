
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Role } from '../types';
import { useAuth } from '../context/AuthContext';

export const useAuthRole = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Fallback to Context if Supabase isn't active
  const { user } = useAuth(); 

  useEffect(() => {
    const fetchRole = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // If no Supabase session, check local context (Mock Mode)
          if (user) {
             setRole(user.role);
             setUserId(user.id);
          } else {
             setRole(null);
             setUserId(null);
          }
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.warn('Supabase RBAC check failed, using default or context:', error.message);
          // Fallback to local user role if DB fetch fails
          setRole(user?.role || 'foreman'); 
        } else {
          // Mapping DB enum to Typescript Role
          const dbRole = data?.role;
          let mappedRole: Role = 'foreman';
          
          if (dbRole === 'super_admin') mappedRole = 'admin';
          else if (dbRole === 'project_manager') mappedRole = 'engineering';
          else if (dbRole === 'site_manager') mappedRole = 'foreman';
          else if (dbRole === 'client') mappedRole = 'client';
          
          setRole(mappedRole);
        }
      } catch (e) {
        console.error('Auth check critical failure', e);
        setRole(user?.role || null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [user]);

  const hasPermission = (allowedRoles: Role[]) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return { role, loading, userId, hasPermission };
};
