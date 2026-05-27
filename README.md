# Numeritos

Juego de lógica al estilo "toros y vacas" / Mastermind con dígitos.

## Reglas

- La máquina elige 4 numeritos del 0 al 9, **sin repetir**.
- Vos tirás combinaciones de 4 dígitos (sin repetir).
- Te respondemos con:
  - **Buenos**: cantidad de números que están en la posición correcta.
  - **Regulares**: cantidad de números correctos pero en otra posición.
- A la derecha tenés una grilla 10×4 para tachar/marcar mentalmente qué dígito puede ir en cada posición.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000.

## Build estático

```bash
npm run build
```

El sitio queda en `out/`, listo para servir como estático.

## Deploy

Hay un workflow en `.github/workflows/deploy.yml` que publica a GitHub Pages
en cada push a `main` o a la rama de desarrollo.
Para activar: en Settings → Pages del repo, elegí **Source: GitHub Actions**.
