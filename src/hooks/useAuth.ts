import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutologgingIn, setIsAutologgingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      setError(error.message);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setError("O login por e-mail ainda não está ativo no painel do Firebase. Por favor, ative-o em 'Authentication > Providers'.");
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError("E-mail ou senha incorretos.");
      } else {
        setError("Erro ao entrar: " + error.message);
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setError("O cadastro por e-mail ainda não está ativo no painel do Firebase. Ative-o em 'Authentication > Providers'.");
      } else if (error.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está sendo usado.");
      } else if (error.code === 'auth/weak-password') {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setError("Erro ao criar conta: " + error.message);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('autoLoginEmail');
      localStorage.removeItem('autoLoginPass');
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autologin = params.get('autologin');
    
    // Check if we have credentials in URL or local storage
    const storedEmail = localStorage.getItem('autoLoginEmail');
    const storedPass = localStorage.getItem('autoLoginPass');

    if (autologin === 'turenpro' || (storedEmail && storedPass)) {
      // Hardcoded or stored credentials for the "Link Only" access
      const email = storedEmail || "usye5303@gmail.com";
      const pass = storedPass || "turen123";

      if (!user && !loading) {
        setIsAutologgingIn(true);
        loginWithEmail(email, pass).then(() => {
          localStorage.setItem('autoLoginEmail', email);
          localStorage.setItem('autoLoginPass', pass);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }).catch(err => {
          console.error("Auto-login failed:", err);
          localStorage.removeItem('autoLoginEmail');
          localStorage.removeItem('autoLoginPass');
        }).finally(() => {
          setIsAutologgingIn(false);
        });
      }
    }
  }, [user, loading]);

  return { user, loading, isAutologgingIn, loginWithGoogle, loginWithEmail, signUpWithEmail, logout, error };
}
