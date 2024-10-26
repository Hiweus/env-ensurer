// Declaração de variáveis
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Comentario de exemplo no arquivo */
      DEV_PORT?: `${number}`
      /** Outro comentáro de exemplo */
      PUBLIC_PATH?: `${'http' | 'https'}://${string}`
      
      // Comentario de apenas uma linha
      TZ?: string

      /** 
       * Agora utilizando multiiplas linhas
       */
      SOME_HOST?: `${'http' | 'https'}://${string}.com.br`
    }
  }
}

export { }