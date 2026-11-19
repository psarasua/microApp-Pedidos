// Límites de seguridad y de envío de correos.

// ---- Límites de seguridad ----
export const MAX_PENDIENTES = 100 // cuentas verificadas esperando aprobación
export const INTENTOS_ID = 10
export const CODIGO_VENCE_MIN = 15 // minutos de vida de un código
export const CODIGO_INTENTOS = 5 // intentos por código
export const ESPERA_SEG = 60 // espera mínima entre dos correos al mismo destino
export const ENVIOS_CORREO_HORA = 3 // correos por dirección y por hora
export const ENVIOS_IP_HORA = 10 // correos por conexión y por hora
export const REGISTROS_IP_HORA = 5 // registros por conexión y por hora
export const ENVIOS_GLOBAL_DIA = 250 // tope diario (el plan gratis de Brevo permite 300)
export const SIN_VERIFICAR_HORAS = 24 // las cuentas sin verificar se borran pasado este tiempo
