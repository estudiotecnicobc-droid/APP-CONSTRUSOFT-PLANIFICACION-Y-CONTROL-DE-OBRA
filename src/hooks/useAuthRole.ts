
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Role } from '../types';

export const useAuthRole = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      setLoading(true);
      try {
        // Cast auth to any to handle type definition mismatches
        const auth = supabase.auth as any;
        const { data: { session } } = await auth.getSession();
        
        if (!session?.user) {
          setRole(null);
          setUserId(null);
          return;
        }

        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching role:', error);
          // Fallback safest role
          setRole('foreman'); 
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
        console.error('Auth check failed', e);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    const auth = supabase.auth as any;
    const { data: authListener } = auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const hasPermission = (allowedRoles: Role[]) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return { role, loading, userId, hasPermission };
};