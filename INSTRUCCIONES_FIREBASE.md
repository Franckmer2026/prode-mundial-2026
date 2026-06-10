# Guía Paso a Paso: Configuración de Firebase y Despliegue del Prode

Esta guía te ayudará a configurar Firebase desde cero y poner tu aplicación de Prode en internet para que la usen tus compañeros.

---

## PASO 1: Crear el Proyecto en Firebase (Solo clics)

1. Entrá a la web de la consola de Firebase: **[console.firebase.google.com](https://console.firebase.google.com/)**
2. Iniciá sesión con cualquier cuenta de Gmail.
3. Hacé click en el botón grande **"Agregar proyecto"** (o "Add project").
4. Escribí un nombre para tu Prode, por ejemplo: `prode-mundial-2026-trabajo`. Hacé click en **"Continuar"**.
5. Te va a preguntar por Google Analytics. Desactivalo (el interruptor gris) para no complicar la configuración. Hacé click en **"Crear proyecto"**.
6. Esperá unos segundos a que termine de crearse y hacé click en **"Continuar"**.

---

## PASO 2: Obtener las Credenciales (Los códigos)

1. En el panel que se abre, vas a ver varios círculos abajo del título de tu proyecto. Hacé click en el ícono que tiene forma de código web: **`</>`**.
2. Te va a pedir registrar la aplicación:
   * En "Apodo de la app", escribí `prode-web`.
   * **IMPORTANTE:** Marcá la casilla que dice *"Configurar también Firebase Hosting para esta app"*. Esto nos ahorrará pasos después.
   * Hacé click en el botón azul **"Registrar app"**.
3. Te va a aparecer un bloque de código en pantalla. **No te asustes**. Buscá la parte que dice `const firebaseConfig = { ... }`.
4. **Copiá todo ese bloque de texto y pegalo directamente en el chat con tu asistente de IA.** El asistente se encargará de colocarlo en los archivos correctos. Vos no tenés que modificar código.

---

## PASO 3: Activar las Funciones en la Consola de Firebase

Tenés que hacer dos cosas rápidas en la web para que la app funcione:

### A) Activar el Inicio de Sesión (Authentication)
1. En el menú de la izquierda de la consola de Firebase, hacé click en **"Authentication"** (suele estar arriba).
2. Hacé click en el botón **"Comenzar"** (Get Started).
3. Vas a ver una lista de proveedores. Hacé click en el que dice **"Correo electrónico/contraseña"** (Email/Password).
4. Activá la primera opción (Habilitar / Enable) presionando el interruptor.
5. Hacé click en **"Guardar"** (Save).

### B) Activar la Base de Datos (Firestore Database)
1. En el menú de la izquierda, hacé click en **"Firestore Database"** (abajo de Authentication).
2. Hacé click en el botón **"Crear base de datos"** (Create database).
3. Te va a preguntar por las reglas de seguridad:
   * Seleccioná **"Comenzar en modo de prueba"** (Start in test mode).
   * Hacé click en **"Siguiente"**.
4. Te va a pedir una ubicación de almacenamiento (Cloud Firestore Location). La que viene por defecto sirve perfectamente. Hacé click en **"Habilitar"** (Enable).

---

## PASO 4: Subir la App a Internet (Despliegue)

Una vez que le pases las credenciales al asistente de IA y este te confirme que las configuró en el proyecto, podés desplegar la app para que tus compañeros accedan.

1. Abrí la terminal en tu computadora (PowerShell) en la carpeta del proyecto:
   `C:\Users\Frank\AppData\Local\Temp\antigravity\scratch\prode-mundial-2026`
2. Instalá las herramientas de Firebase ejecutando el siguiente comando:
   ```bash
   npm install -g firebase-tools
   ```
3. Iniciá sesión en tu cuenta de Firebase desde tu computadora ejecutando:
   ```bash
   firebase login
   ```
   *(Se abrirá una pestaña en tu navegador web. Seleccioná tu cuenta de Google y dale permisos).*
4. Subí la aplicación escribiendo este comando en la terminal:
   ```bash
   npm run build
   firebase deploy
   ```
5. Al finalizar, la terminal te va a mostrar una línea que dice:
   `Hosting URL: https://tu-proyecto.web.app`

¡Esa es la URL que tenés que pasarle a tus compañeros por WhatsApp o Slack para que se registren y comiencen a jugar!
