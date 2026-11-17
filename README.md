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

## Aviso de registro de tiempo al enviar correos (Gmail)

Al enviar un correo, la extensión propone imputar tiempo a una tarea de Holded:

- Solo aparece cuando Gmail **confirma que el mensaje se ha enviado** (no en errores ni si se cancela con "Deshacer") y **nunca bloquea el envío**.
- Buscador de proyecto/tarea (solo proyectos y tareas abiertos), con tus **tareas recientes** y la **sugerida** según el asunto del correo.
- Tiempo sugerido según lo que tardaste en redactar (tramos de 5 min, máx. 60), editable; fecha y descripción (`Email: <asunto>`).
- Se puede **omitir** (Esc), **silenciar 1 h**, **no volver a mostrar**, o activar/desactivar en *Ajustes*.
- Solo con sesión iniciada. Funciona en Gmail web (no en móvil ni en otros clientes).

Código: `public/gmail-send.js` (detección) y `src/components/QuickLogView.tsx` (formulario).

## Despliegue

1. **Rotar la clave de Holded** (la anterior estuvo publicada en el repositorio) y generar una nueva en Holded.
2. Desplegar el gateway (`npm run build && npm start`) en Cloud Run con las variables de `.env.example`
   (`HOLDED_API_KEY` como secreto, `ALLOWED_DOMAINS`, `GOOGLE_OAUTH_CLIENT_ID`).
3. En Google Cloud, crear un cliente OAuth de tipo **Extensión de Chrome** con el ID de la extensión de la Chrome Web Store.
4. Empaquetar: `GATEWAY_URL=https://… OAUTH_CLIENT_ID=… npm run build` → `segurnube-holded-sync-v3.0.0.zip`.
5. Subir el ZIP a la Chrome Web Store.

## Desarrollo local

`DEV_AUTH_EMAIL=tu@correo.com HOLDED_API_KEY=… npm run dev` (la identidad de desarrollo se ignora con `NODE_ENV=production`).
