declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production'

      HTTP_PORT?: `${number}`
      HTTP_USERNAME?: string
      HTTP_PASSWORD?: string

      GRPC_HOST?: string
      GRPC_PORT?: `${number}`
      // meu comentario vem aqui
      DB_HOST?: string
      DB_PORT?: `${number}`
      DB_USER?: string
      DB_PASSWORD?: string
      DB_DATABASE?: string
      DB_REPLICA_HOST?: string
      DB_REPLICA_PORT?: `${number}`
      DB_REPLICA_USER?: string
      DB_REPLICA_PASSWORD?: string
      DB_REPLICA_DATABASE?: string

      MY_HOST_KEYSPACE: string
      MY_HOST_DATACENTER: string
      MY_HOST_CONTACT_POINTS?: string

      "API PAYMENTS": string
      "API WITH SPACE AND NUMBERS": "SPACE"

      SOME_NUMBER_123123?: string
    }
  }
}

export { }