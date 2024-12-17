"use client"

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useState, ReactNode, FC } from 'react';

interface SupabaseContextProps {
  supabase: SupabaseClient;
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,)
const SupabaseContext = createContext<SupabaseContextProps>({supabase});

const SupabaseProvider: FC<{ children: ReactNode }> = ({ children }) => {
  

  /*const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };*/

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export { SupabaseContext, SupabaseProvider };
