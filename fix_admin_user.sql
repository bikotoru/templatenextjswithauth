-- Actualizar usuario admin para que funcione con la nueva estructura multi-tenant
USE demonextjs;

-- Actualizar el password del usuario admin@techcorp.cl con hash bcrypt
UPDATE users 
SET password_hash = '$2b$12$HujzpkQIRv4advW5CN94m.9eR40znxsmrmgn8DOIHSJocmUjtVxgq'
WHERE email = 'admin@techcorp.cl';

-- Verificar que el usuario existe y está actualizado
SELECT id, email, name, password_hash, active, created_at 
FROM users 
WHERE email = 'admin@techcorp.cl';

PRINT 'Usuario admin@techcorp.cl actualizado. Password: admin123';