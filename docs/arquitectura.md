# Arquitectura y decisiones

El monolito modular usa Next.js App Router con React y Tailwind para la interfaz, Zod para validar datos externos, Prisma y PostgreSQL para persistencia, y Playwright para generar informes. Los componentes de formulario reutilizan controles HTML nativos con etiquetas, estados y navegación por teclado.

## Responsabilidades

| Ruta en el repositorio | Responsabilidad |
| --- | --- |
| `src/app` | Vistas, navegación por rol y endpoints de PDF y salud |
| `src/ui` | Controles reutilizables y estructura de sesión |
| `src/server` | Sesiones, acciones, autorización, consultas, transacciones y generación del PDF |
| `src/domain` | Validación del cuestionario, cálculo de puntajes y empates |
| `prisma` | Esquema, migraciones, cinco especialidades y enunciados de referencia |
| `tests`, `e2e` | Pruebas de dominio, PostgreSQL y navegador |

## Acceso

- Estudiantes: instrucciones, matrícula, intento propio y confirmación de envío.
- DECE: estudiantes y estados por año lectivo, visor y descarga de informes finalizados.
- Administración: alta y mantenimiento de estudiantes y cuentas DECE, credenciales temporales, convocatorias, versiones y políticas. La cuenta administradora inicial se crea mediante el seed.

La cookie contiene un token aleatorio, y PostgreSQL conserva su hash y caducidad. Las contraseñas se almacenan con scrypt y sal individual. El cambio de contraseña, el restablecimiento y la desactivación invalidan sesiones previas. El inicio de sesión limita intentos por usuario. Las acciones del servidor verifican el rol y las operaciones del cuestionario verifican el dueño del intento. Next.js compara origen y host en las Server Actions. Las consultas de informe exigen el rol DECE y responden con caché privada deshabilitada.

La auditoría registra identificadores internos y eventos, incluidas las modificaciones administrativas y la entrega de informes. Las búsquedas con cédula se transmiten mediante una acción POST. Los identificadores de las rutas son UUID.

## Cuestionario y persistencia

Una matrícula vincula estudiante, año y paralelo. La convocatoria vincula el año con una versión publicada e inmutable desde la aplicación. Puede cerrarse para impedir nuevos inicios. Se permite un intento por matrícula y se guarda el orden aleatorio mediante relaciones con las preguntas de la versión.

Una transacción con bloqueo de matrícula evita inicios duplicados. Guardado y finalización bloquean la misma fila del intento. Cada posición tiene una sola respuesta, actualizable mientras el intento siga abierto. La finalización verifica las 50 respuestas, calcula puntajes y guarda resultado, fecha y datos de identificación para reproducir el informe aun si se modifican posteriormente la matrícula o los datos del estudiante.

La puntuación de cada especialidad se calcula sobre 10 preguntas. El porcentaje es el puntaje multiplicado por 10. El máximo puede corresponder a varias especialidades. La tabla del DECE muestra estados y fechas. El PDF muestra afinidades y el orden en que se presentaron las preguntas.

## Impresión y operación

La plantilla HTML usa cuatro bloques A4 explícitos. El primero contiene el resumen, las afinidades y las preguntas 01 a 05. Los demás contienen 06 a 23, 24 a 41 y 42 a 50. La cabecera institucional y el aviso de confidencialidad se repiten. Chromium genera el documento sin acceso a red ni ejecución de scripts de la plantilla.

Configura en el servidor de producción la rotación de logs, respaldos y restauración, y una tarea de mantenimiento para borrar sesiones y contadores de acceso vencidos de las tablas `Session` y `LoginLimit`. El borrado de expedientes y auditoría se rige por la política institucional. La ley aplicable y sus obligaciones deben revisarse con la institución antes de habilitar el tratamiento de datos de menores.

- [Documentación de transacciones de Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions)
- [Documentación de cookies de Next.js](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Referencia de PDF de Playwright](https://playwright.dev/docs/api/class-page#page-pdf)
- [Guía de almacenamiento de contraseñas de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
