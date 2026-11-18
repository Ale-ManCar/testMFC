# Sistema de Orientación Vocacional Estudiantil

Aplicación institucional en español para estudiantes de Décimo de Educación General Básica. Registra intereses declarados en cinco especialidades y genera informes confidenciales para el DECE.

## Iniciar con Docker Compose

Requisitos: Docker Desktop o Docker Engine con Compose v2 y acceso al registro de imágenes.

1. Copia `.env.example` como `.env`.
2. Define `POSTGRES_PASSWORD` con una contraseña aleatoria apta para URL, por ejemplo una cadena larga hexadecimal. Usa la misma contraseña en `DATABASE_URL` si también conectarás desde el equipo.
3. Usa `DEMO_DATA=1` para una evaluación local con datos ficticios. Para una instalación institucional usa `DEMO_DATA=0` y configura `BOOTSTRAP_ADMIN` y `BOOTSTRAP_PASSWORD`. La contraseña inicial debe tener al menos 14 caracteres.
4. Ejecuta `docker compose up --build -d --wait`. Se aplican las migraciones y la carga inicial. Abre [la aplicación](http://localhost:3000).

Los puertos locales se pueden ajustar mediante `APP_PORT` y `DB_PORT`. Si cambias el puerto web, actualiza también `APP_ORIGIN`. Compose publica los servicios en loopback. PostgreSQL conserva los registros en un volumen. `docker compose down` detiene el entorno y conserva el volumen.

### Cuentas ficticias

Usa estas cuentas solo con `DEMO_DATA=1` en un entorno local descartable.

| Rol | Usuario | Contraseña inicial |
| --- | --- | --- |
| Administración | `demo-admin` | `Demo-Admin-Solo-Local!` |
| DECE | `demo-dece` | `Demo-Dece-Solo-Local!` |
| Estudiante | `demo-001` | `Demo-Estudiante-Temporal!` |

La demostración abre la convocatoria 2026–2027. El estudiante cambia la contraseña al iniciar sesión. Para repetir la evaluación, registra otro estudiante ficticio con un código y un usuario únicos.

## Ejecutar con PostgreSQL local

Requisitos: Node.js 24, npm, PostgreSQL y Chromium de Playwright. Crea una base de datos y asigna a `DATABASE_URL` una cuenta con acceso a ella. Copia el resto de la configuración de `.env.example`. En Windows puedes usar `npm.cmd` y `npx.cmd`.

```sh
npm ci
npm run db:generate
npx playwright install chromium
npm run db:migrate
npm run db:seed
npm run dev -- --hostname 127.0.0.1
```

En Linux, instala las dependencias del navegador mediante `npx playwright install --with-deps chromium`. Para comprobar una instancia en ejecución usa `GET /api/salud`, que devuelve 200 si PostgreSQL responde y 503 si no está disponible.

## Operación

- **Administración.** Crea cuentas, activa o desactiva acceso, registra matrículas y configura la institución. Crea un borrador a partir de una versión publicada, revisa la distribución de preguntas y publícalo antes de asignarlo a un año lectivo. La carga inicial ya incluye el cuestionario de referencia.
- **Estudiante.** Inicia sesión con cédula o DNI. La clave temporal se genera aleatoriamente y se cambia al entrar. Cada respuesta confirmada se guarda al seleccionarla y el cuestionario se puede reanudar.
- **DECE.** Busca por nombre, cédula o código. Filtra por año, paralelo y estado. Los intentos finalizados muestran **Ver resultados** con visor, descarga e impresión en el visor nativo del navegador.
- **CSV.** Usa UTF-8 y los encabezados `cedula,nombre,codigo,anio,paralelo`. El archivo puede contener hasta 100 registros. Si hay datos inválidos o duplicados, se rechaza la importación completa. Las contraseñas temporales se muestran al terminar el alta y se entregan por un canal privado.

## Pruebas

```sh
npm run check
npm test
npm run build
```

Para ejecutar las pruebas de integración y de navegador, usa una **base PostgreSQL aislada para pruebas**. Define `DATABASE_URL` en el entorno de los comandos y ejecuta las migraciones y la carga con `DEMO_DATA=1`. Playwright usa el puerto 3100 por defecto y genera artefactos en `test-results/`. La suite de navegador crea cuentas ficticias nuevas en cada ejecución.

```sh
npm run db:migrate
npm run db:seed
npm test
npm run test:e2e
```

Vitest omite la prueba de integración si `DATABASE_URL` no está definida en el entorno del proceso. Con RUN_PDF_TESTS=1 y Chromium instalado, Vitest comprueba también la paginación con preguntas extensas. La verificación del PDF comprueba las cuatro páginas, el tamaño A4, la identidad ficticia del estudiante, las respuestas y el resultado.

## Despliegue institucional

Compose está orientado a desarrollo. Para producción ejecuta `npm run build` y `npm start` con `DEMO_DATA=0`, detrás de un proxy HTTPS con `APP_ORIGIN` igual a la URL pública. Configura el proxy para conservar el host público y aplicar límites de acceso por IP. Protege la red y credenciales de PostgreSQL, ejecuta migraciones antes del arranque y programa copias de seguridad con restauraciones de prueba. Ejecuta Chromium como usuario de servicio con privilegios mínimos y habilita `PDF_CHROMIUM_SANDBOX=1` si el entorno admite el sandbox del navegador. Retira el secreto de arranque del entorno de ejecución después de crear la cuenta inicial.

La institución puede registrar y publicar sus políticas de acceso y retención desde el panel. La retención se documenta en la aplicación y se ejecuta mediante los procedimientos de la institución. La aplicación no elimina expedientes según el texto de la política. Define responsables, plazos, procedimiento de atención de derechos y manejo de copias impresas antes de incorporar datos reales.

- [Arquitectura, roles y decisiones](docs/arquitectura.md)
- [Normativa de la Superintendencia de Protección de Datos Personales de Ecuador](https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/normativa/)
