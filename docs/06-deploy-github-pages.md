# Deploy en GitHub Pages

## Build local

```bash
npm install
npm run build
```

## Base path

`vite.config.ts` usa `base: './'` para que los assets funcionen en GitHub Pages sin conocer el nombre del repositorio.

## Publicación manual

Subir el contenido de `dist/` a GitHub Pages.

## Publicación por GitHub Actions

Crear workflow que instale dependencias, ejecute `npm run build` y publique `dist/`.

## Variables

GitHub Pages no debe almacenar `service_role`. Solo:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
