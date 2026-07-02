If you want it even shorter:

```markdown
# NoodleFlow Prototype

Dev-only static prototype: **`index.html`** + **`.jsx`** + **`.css`**. No build, no API.

```bash
python3 -m http.server 8080
# -> http://localhost:8080
```

## Docker

Run the static prototype with Docker Compose:

```bash
docker compose up -d --build
# -> http://localhost:8081
```

Stop it with:

```bash
docker compose down
```
