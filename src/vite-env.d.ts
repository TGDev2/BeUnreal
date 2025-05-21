/* ---------------------------------------------------------------------------------
 *  Déclarations globales : assure la présence de import.meta.env dans le checker TS
 * --------------------------------------------------------------------------------*/
interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    // ➕ ajoutez ici d’autres variables exposées par Vite si nécessaire
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  