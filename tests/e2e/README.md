# Browser tests

A small Django project (`project/` and `demo/`) that uses django-liveview
mounted from the repository root, plus Playwright tests (`browser/`) for the
back/forward navigation history.

## Run the tests

```bash
docker compose run --rm e2e
```

It starts Redis and the demo server, waits until the server is healthy and
runs `pytest` inside the official Playwright image against `http://web:8000`.

The JavaScript is loaded from `liveview/static/liveview/liveview.js`, so
rebuild it (`npm run build:min` in `frontend/`) before running the tests
after changing the frontend.

## Try the demo by hand

```bash
docker compose up web
```

Open <http://localhost:8400>. To run the browser tests from your machine
against it, install `pytest-playwright` and run `pytest` in this folder
(`BASE_URL` defaults to `http://localhost:8400`).

## Clean up

```bash
docker compose --profile test down
```
