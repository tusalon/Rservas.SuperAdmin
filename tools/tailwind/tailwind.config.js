// Estilos del panel generados de antemano (vendor/tailwind.css) en vez de
// compilarlos en el navegador con cdn.tailwindcss.com en cada apertura.
// Regenerar despues de tocar clases (desde la raiz del repo):
//   npx tailwindcss@3.4.17 -c tools/tailwind/tailwind.config.js -i tools/tailwind/entrada.css -o vendor/tailwind.css --minify
// y subir el ?v= de vendor/tailwind.css en index.html y login.html.
module.exports = {
    content: ['./index.html', './login.html', './super-admin.js', './commercial-tracking.js'],
};
