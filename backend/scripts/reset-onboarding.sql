-- ============================================================================
-- SCRIPT SQL PARA RESETEAR ONBOARDING DE UN USUARIO (TESTING)
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza 'tu-email@ejemplo.com' con el email del usuario
-- 2. Ejecuta: psql $DATABASE_URL -f scripts/reset-onboarding.sql
-- 
-- O manualmente en psql:
-- psql $DATABASE_URL
-- \i scripts/reset-onboarding.sql
-- ============================================================================

-- PASO 1: Ver usuarios disponibles (opcional)
\echo '📋 Usuarios disponibles:'
SELECT 
    u.id, 
    u.email, 
    u."companyName",
    CASE WHEN uo.is_completed THEN '✅ Completo' ELSE '⏳ Pendiente' END as onboarding,
    CASE WHEN uo.welcome_message_shown THEN '✅ Visto' ELSE '❌ No visto' END as welcome
FROM users u
LEFT JOIN user_onboarding uo ON u.id = uo.user_id
ORDER BY u."createdAt" DESC
LIMIT 10;

\echo ''
\echo '⚠️  Cambia el email en la siguiente línea:'
\echo ''

-- PASO 2: Configurar el email del usuario a resetear
\set user_email 'tu-email@ejemplo.com'

-- PASO 3: Obtener el user_id
\echo '🔍 Buscando usuario...'
SELECT id FROM users WHERE email = :'user_email' \gset user_

-- Verificar que se encontró el usuario
\if :{?user_id}
    \echo '✅ Usuario encontrado'
\else
    \echo '❌ Usuario no encontrado. Verifica el email.'
    \q
\endif

-- PASO 4: Eliminar registro de onboarding existente
\echo '🗑️  Eliminando registro existente...'
DELETE FROM user_onboarding WHERE user_id = :'user_id';

-- PASO 5: Crear nuevo registro limpio
\echo '➕ Creando nuevo registro...'
INSERT INTO user_onboarding (
    id,
    user_id,
    company_info_completed,
    logo_uploaded,
    financial_info_completed,
    smtp_configured,
    first_client_created,
    first_product_created,
    first_invoice_created,
    is_completed,
    current_step,
    skipped_steps,
    welcome_message_shown,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    :'user_id',
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    'company_info',
    '{}',
    false,
    NOW(),
    NOW()
);

-- PASO 6: Verificar resultado
\echo ''
\echo '✅ Onboarding reseteado exitosamente'
\echo ''
\echo '📊 Estado actual:'
SELECT 
    u.email,
    uo.current_step as "Paso Actual",
    uo.is_completed as "Completado",
    uo.welcome_message_shown as "Welcome Visto",
    uo.company_info_completed as "Info Empresa",
    uo.smtp_configured as "SMTP Config"
FROM users u
JOIN user_onboarding uo ON u.id = uo.user_id
WHERE u.id = :'user_id';

\echo ''
\echo '🎉 ¡Listo para probar!'
\echo ''
\echo '💡 Próximos pasos:'
\echo '   1. Cierra sesión si estás logueado'
\echo '   2. Inicia sesión con el usuario'
\echo '   3. ✨ El Welcome Modal debería aparecer automáticamente'
\echo '   4. Prueba el flujo completo del onboarding (7 pasos)'
\echo ''
