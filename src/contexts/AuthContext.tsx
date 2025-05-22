import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

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

    /* ───────────────────────────────────────────────
     *  Charge la session persistée + listener global
     * ─────────────────────────────────────────────── */
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session ?? null);
            setLoading(false);
        })();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    /* ───────────────────────────────────────────────
     *  Helpers
     * ─────────────────────────────────────────────── */
    const refreshSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) setSession(data.session);
        return data.session;
    };

    const signIn = async ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }) => {
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        const sess = await refreshSession();

        setLoading(false);

        /* S’il n’y a toujours pas de session, l’erreur est réelle */
        if (!sess && error) throw error;
    };

    const signUp = async ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }) => {
        setLoading(true);

        const { error } = await supabase.auth.signUp({ email, password });
        await refreshSession(); // peut demeurer null (e-mail à confirmer)

        setLoading(false);

        if (error) throw error;
    };

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setSession(null);
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
