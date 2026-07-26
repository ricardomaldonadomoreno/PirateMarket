# Notas: Rediseño RLS y Roles Admin

## Estado actual
- Tabla `users`: tiene `user_type` ENUM ('person', 'shop', 'wholesale', 'admin')
- Tabla `admin_roles`: separada, con role (super_admin/admin/moderator), app, notes
- Tu user_id: `0fde1947-94ae-45c0-8b5b-cb309cdcdb47`
- Problema: RLS de admin_roles tiene política circular (necesitas rol para leer roles)

## Problema con RLS actual
- Política SELECT en admin_roles: `EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())`
- Esto es circular: no puedes leer admin_roles a menos que ya tengas un rol
- Al ejecutar INSERT desde SQL Editor, auth.uid() = null → trigger de auditoría falla

## Lo que el usuario quiere
1. Él es el ÚNICO super_admin → su rol está FIJO en la DB, no se modifica desde la app
2. Los sub-admins son USUARIOS normales que pueden ver/editar datos de las tablas
3. Sub-admins = usuarios con user_type='admin' que tienen acceso de lectura/escritura a tablas de datos
4. Las políticas RLS deben ser simples y directas

## Políticas RLS existentes en schema.sql (que usan user_type='admin')
- verification_requests: "Admins can manage all verifications" → user_type='admin'
- traficante_verification_requests: "Admins can manage" → user_type='admin'
- traficante_profiles: "Admins can update" → user_type='admin'

## Políticas que usan admin_roles (backoffice_setup.sql)
- admin_roles: SELECT requiere tener rol en admin_roles (CIRCULAR)
- admin_roles: INSERT/UPDATE/DELETE requiere super_admin
- featured_listings: SELECT/UPDATE requiere tener rol en admin_roles
- featured_trips: SELECT/UPDATE requiere tener rol en admin_roles
- featured_listings.sql: usa user_type='admin' (versión anterior)

## Solución propuesta
- Simplificar: usar user_type='admin' como fuente de verdad (ya existe en el schema)
- Tú eres el único con user_type='admin' en la tabla users
- Sub-admins que crees desde la app también tendrán user_type='admin'
- Las políticas RLS ya existentes en schema.sql usan user_type='admin'
- Eliminar la tabla admin_roles o simplificarla
- La tabla admin_roles puede quedar como tabla de PERMISOS (qué tablas puede ver cada sub-admin)
- O simplemente: todos los user_type='admin' pueden ver todo, tú eres el único super_admin que puede crear/eliminar admins
