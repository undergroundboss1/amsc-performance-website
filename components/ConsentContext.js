'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ConsentContext = createContext({ consent: null, accept: () => {}, decline: () => {} });

export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    setConsent(localStorage.getItem('cookie-consent'));
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    setConsent('accepted');
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem('cookie-consent', 'declined');
    setConsent('declined');
  }, []);

  return (
    <ConsentContext.Provider value={{ consent, accept, decline }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
