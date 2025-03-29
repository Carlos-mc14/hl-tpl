import { MongoClient, type Db } from "mongodb"
import { trackConnection, releaseConnection as releaseConnectionTracker } from "./connection-manager"

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10, // Limitar el número máximo de conexiones en el pool
  minPoolSize: 5, // Mantener un mínimo de conexiones abiertas
  maxIdleTimeMS: 30000, // Cerrar conexiones inactivas después de 30 segundos
  connectTimeoutMS: 10000, // Tiempo de espera para conexiones
  socketTimeoutMS: 45000, // Tiempo de espera para operaciones
}

// Variables globales para la conexión
let client: MongoClient
let clientPromise: Promise<MongoClient>
let db: Db
let isConnected = false

if (process.env.NODE_ENV === "development") {
  // En desarrollo, usar una variable global para preservar la conexión
  // entre recargas de módulos causadas por HMR (Hot Module Replacement)
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
    _mongoDb?: Db
    _mongoConnected?: boolean
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
    globalWithMongo._mongoClientPromise
      .then((client) => {
        globalWithMongo._mongoDb = client.db()
        globalWithMongo._mongoConnected = true
        console.log("MongoDB connected (development)")
      })
      .catch((err) => {
        console.error("MongoDB connection error (development):", err)
      })
  }
  clientPromise = globalWithMongo._mongoClientPromise
  db = globalWithMongo._mongoDb as Db
  isConnected = globalWithMongo._mongoConnected || false
} else {
  // En producción, es mejor no usar una variable global
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
  clientPromise
    .then((client) => {
      db = client.db()
      isConnected = true
      console.log("MongoDB connected (production)")
    })
    .catch((err) => {
      console.error("MongoDB connection error (production):", err)
    })
}

// Función para obtener la base de datos con manejo de reconexión
export async function getDb(): Promise<Db> {
  try {
    if (!isConnected) {
      // Si no está conectado, intentar reconectar
      const connectedClient = await clientPromise
      db = connectedClient.db()
      isConnected = true
      console.log("MongoDB reconnected successfully")
    }

    // Rastrear la conexión
    trackConnection()

    return db
  } catch (error) {
    console.error("Error getting MongoDB connection:", error)
    // Reintentar la conexión
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
    const connectedClient = await clientPromise
    db = connectedClient.db()
    isConnected = true
    console.log("MongoDB reconnected after error")
    return db
  }
}

// Función para liberar explícitamente una conexión
export function releaseConnection(): void {
  releaseConnectionTracker(`mongo_${Date.now()}`)
}

// Función para cerrar todas las conexiones (útil para pruebas o cierre de aplicación)
export async function closeConnections(): Promise<void> {
  if (client) {
    await client.close()
    isConnected = false
    console.log("All MongoDB connections closed")
  }
}

export default clientPromise

