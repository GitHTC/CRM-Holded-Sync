# Segurnube · Holded CRM y Proyectos (extensión de Chrome)

Gestiona oportunidades (CRM), tareas y registro de tiempos de Holded desde Gmail, Chat, Calendar y Drive.

## Seguridad (v3)

```
Extensión ──(token de Google)──▶ Gateway (Cloud Run) ──(clave Holded)──▶ Holded
```

- **La clave API de Holded nunca llega al navegador.** Vive solo en el gateway (`HOLDED_API_KEY`, idealmente en Secret Manager).
- El usuario inicia sesión con su **cuenta de Google Workspace** (`chrome.identity`). El gateway verifica el token con Google, comprueba el dominio permitido y lo cruza con los empleados de Holded.
- El cliente solo recibe **su propio** registro de empleado: no se puede listar ni suplantar a otros usuarios.
- El gateway solo reenvía a Holded las rutas de CRM y Proyectos que usa la extensión.

## Despliegue

1. **Rotar la clave de Holded** (la anterior estuvo publicada en el repositorio) y generar una nueva en Holded.
2. Desplegar el gateway (`npm run build && npm start`) en Cloud Run con las variables de `.env.example`
   (`HOLDED_API_KEY` como secreto, `ALLOWED_DOMAINS`, `GOOGLE_OAUTH_CLIENT_ID`).
3. En Google Cloud, crear un cliente OAuth de tipo **Extensión de Chrome** con el ID de la extensión de la Chrome Web Store.
4. Empaquetar: `GATEWAY_URL=https://… OAUTH_CLIENT_ID=… npm run build` → `segurnube-holded-sync-v3.0.0.zip`.
5. Subir el ZIP a la Chrome Web Store.

## Desarrollo local

`DEV_AUTH_EMAIL=tu@correo.com HOLDED_API_KEY=… npm run dev` (la identidad de desarrollo se ignora con `NODE_ENV=production`).
