# DocScan 📄✨

Aplicación web moderna, ágil y sin enredos para convertir fotos de documentos en documentos digitalizados tipo escáner de alta fidelidad y legibilidad.

Diseñada tanto para **teléfonos móviles** (iOS y Android) como para **ordenadores (PC)**.

---

## 🌟 Características Principales

- **Carga Masiva Simultánea**: Sube múltiples fotos a la vez desde el explorador de archivos o la galería de tu celular sin tener que digitalizar foto por foto.
- **Acceso Directo a Cámara**: Toma fotos de documentos directamente con la cámara trasera de tu teléfono con modo continuo ("Tomar siguiente").
- **Corrección de Perspectiva con Lupa**: Endereza documentos tomados en ángulo con 4 esquinas interactivas y lupa flotante para evitar que el dedo tape la visión en pantallas táctiles.
- **Filtros de Máxima Legibilidad**:
  - **Doc. Color**: Elimina sombras y gradientes de luz, manteniendo vivos y nítidos sellos oficiales, membretes y firmas a color.
  - **B&N Escáner**: Algoritmo de umbralización adaptativa (Bradley-Roth) que transforma el documento en blanco y negro puro, libre de sombras y ruido.
  - **Escala de Grises**: Suavizado monocromático de alta fidelidad.
  - **Original Enderezado**: Sin alteraciones de color pero con perspectiva corregida.
  - **✨ Botón "Aplicar a todas"**: Aplica el filtro deseado a todas las páginas de un solo clic.
- **Gestión Multipágina**: Reordena páginas con flechas, rota 90° o elimina páginas innecesarias.
- **Exportación Flexible**:
  - Generación de PDF en alta resolución (tamaño A4, Carta o Auto-Ajuste).
  - Descarga individual de páginas en JPG.
  - Compartir directo por WhatsApp, Correo, etc. en móviles (Web Share API).
- **100% Privado y Seguro**: Todo el procesamiento se realiza en la memoria del navegador de tu propio dispositivo. Ningún documento o información viaja a servidores externos.
- **Persistencia Local (IndexedDB)**: No pierdes tu trabajo si el navegador se minimiza o recarga en el móvil.

---

## 🚀 Instalación y Uso

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/kaliman12345678/DOC.SCAN.git
   cd DOC.SCAN
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   - Abre `http://localhost:5173/` en tu PC.
   - O abre la dirección de red local que muestra la terminal para acceder desde tu celular conectado al mismo Wi-Fi.

4. **Compilar para producción**:
   ```bash
   npm run build
   ```

---

## 🛠️ Tecnologías Utilizadas

- [React 19](https://react.dev/)
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) (iconos)
- [jsPDF](https://github.com/parallax/jsPDF) (generación de PDFs)
- HTML5 Canvas & Web APIs (Transformación proyectiva homográfica, algoritmos de umbralización adaptativa e IndexedDB)
