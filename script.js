import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

// URI de conexión a MongoDB (reemplázala con la correcta)
const MONGODB_URI = "mongodb+srv://activoteamclub:Etj7RHYLGSjVVQHT@cluster0.fo8j0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tls=true";

async function initializeDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("Conectando a MongoDB...");
    await client.connect();
    const db = client.db();

    console.log("Inicializando la base de datos...");

    // Inicializar roles predeterminados con la estructura correcta
    await initializeRoles(db);

    // Crear o actualizar usuario administrador
    await createOrUpdateAdmin(db);

    console.log("Base de datos inicializada con éxito.");
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
  } finally {
    await client.close();
    console.log("Conexión a MongoDB cerrada.");
    process.exit(0);
  }
}

async function initializeRoles(db) {
  const rolesCollection = db.collection("roles");
  
  const defaultRoles = [
    {
      name: "Administrator",
      description: "Full system access",
      permissions: [
        "manage:users", 
        "view:users", 
        "manage:roles", 
        "view:roles", 
        "manage:reservations", 
        "view:reservations", 
        "view:reports", 
        "manage:settings"
      ],
    },
    {
      name: "Manager",
      description: "Hotel management access",
      permissions: [
        "view:users", 
        "manage:reservations", 
        "view:reservations", 
        "view:reports"
      ],
    },
    {
      name: "Staff",
      description: "Front desk operations",
      permissions: [
        "manage:reservations", 
        "view:reservations"
      ],
    },
    {
      name: "Customer",
      description: "Regular customer account",
      permissions: [
        "manage:own_profile", 
        "manage:own_reservations", 
        "view:own_reservations"
      ],
    },
  ];
  
  for (const role of defaultRoles) {
    const existingRole = await rolesCollection.findOne({ name: role.name });
    if (!existingRole) {
      await rolesCollection.insertOne({
        ...role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Rol "${role.name}" creado.`);
    } else {
      // Actualizar el rol existente para asegurarse de que tiene los permisos correctos
      await rolesCollection.updateOne(
        { name: role.name },
        { 
          $set: {
            description: role.description,
            permissions: role.permissions,
            updatedAt: new Date()
          } 
        }
      );
      console.log(`Rol "${role.name}" actualizado.`);
    }
  }
}

async function createOrUpdateAdmin(db) {
  const usersCollection = db.collection("users");
  const adminEmail = "admin@example.com";
  const plainPassword = "Admin123!";
  
  // Hashear la contraseña con bcrypt
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  
  const existingAdmin = await usersCollection.findOne({ email: adminEmail });
  
  if (!existingAdmin) {
    // Crear usuario administrador si no existe
    await usersCollection.insertOne({
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      password: hashedPassword, // Contraseña hasheada
      role: "Administrator",
      status: "Active",
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log("Usuario administrador creado y activado exitosamente.");
  } else {
    // Actualizar el usuario administrador existente
    await usersCollection.updateOne(
      { email: adminEmail },
      {
        $set: {
          password: hashedPassword, // Contraseña hasheada
          role: "Administrator",
          status: "Active",
          emailVerified: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    
    console.log("Usuario administrador actualizado exitosamente.");
  }
}

// Ejecutar el script
initializeDatabase();