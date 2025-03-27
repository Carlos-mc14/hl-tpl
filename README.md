# HotelManager - Sistema de Gestión Hotelera

## Descripción
HotelManager es un sistema completo de gestión hotelera con autenticación de usuarios, control de acceso basado en roles, y funcionalidades para la administración de reservas y usuarios.

## Tecnologías
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, MongoDB
- **Autenticación**: JWT, Upstash Redis (sesiones)
- **Email**: SendGrid
- **Despliegue**: Vercel

## Estado de Implementación

### Autenticación y Seguridad
- [x] Registro de usuarios
- [x] Inicio de sesión
- [x] Verificación de email
- [x] Recuperación de contraseña
- [x] Sesiones seguras con Redis
- [x] Protección CSRF
- [x] Validación de entradas
- [x] Encriptación de contraseñas (bcrypt)
- [x] Middleware de autenticación

### Gestión de Usuarios y Roles
- [x] CRUD de usuarios
- [x] CRUD de roles
- [x] Asignación de permisos
- [x] Control de acceso basado en roles (RBAC)

### Funcionalidades del Hotel
- [ ] Gestión de habitaciones
- [ ] Gestión de reservas
- [ ] Facturación
- [ ] Reportes

## Configuración

### Variables de Entorno
Crea un archivo `.env.local` con las siguientes variables:

