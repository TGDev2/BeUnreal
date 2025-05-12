import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { upsertProfile } from '../services/userService';

interface AuthContextValue {
    session: Session | null;
    loading: boolean;
    signIn: (opts: { email: string; password: string }) => Promise<void>;
    signUp: (opts: { email: string; password: string }) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial session load + listener
    useEffect(() => {
        const init = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session ?? null);
            setLoading(false);
        };
        init();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async ({ email, password }: { email: string; password: string }) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) throw error;
    };

    const signUp = async ({ email, password }: { email: string; password: string }) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({ email, password });

        // Crée le profil immédiatement (username et avatar null par défaut)
        if (!error && data.user) {
            try {
                await upsertProfile({ id: data.user.id });
            } catch (profileError) {
                // Ne bloque pas l'inscription si l'insert échoue
                console.error(profileError);
            }
        }

        setLoading(false);
        if (error) throw error;
    };

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
    };

    const value: AuthContextValue = {
        session,
        loading,
        signIn,
        signUp,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};
