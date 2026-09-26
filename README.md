# ProtoMap

Open-web **protobuf viewer & composer**. Load `.proto` files in the browser, explore packages/services/messages, follow type links, generate JSON examples, and compose new schemas — no server, no accounts, no bundled samples.

## Features

- **Load** via multi-file open, drag & drop, paste, or fetch from a CORS-friendly URL (e.g. raw GitHub)
- **Explore** by package tree, file list, or services
- **Structured views** for messages, enums, and RPCs with comments preserved
- **Click-through types** across files (when packages resolve)
- **Search** (`/` or `⌘K`) over types, fields, RPCs, and comments
- **Type graph** (1-hop neighborhood)
- **JSON examples** + grpcurl-style hint for messages/RPCs
- **Compose** enums/messages/services visually → download or load `.proto`
- **Export** Markdown docs / copy fully-qualified names
- **Theme** light/dark (respects system preference)
- Everything stays in your browser unless you explicitly fetch a URL

## Learn (in the app)

Interactive lessons live in the UI — not as separate reading homework:

| Route | Lesson |
|--------|--------|
| `#/learn/protobuf` | Protocol Buffers 3 |
| `#/learn/grpc` | gRPC |
| `#/learn/http2` | HTTP/2 |
| `#/learn/together` | How they compose |
| `#/viewer` | Proto Viewer |

Author notes (optional) remain under `docs/` for maintainers; the product surface is the Carbon UI.

## Run locally

Any static file server works:

```bash
# Python
python3 -m http.server 8080

# Node
npx --yes serve .
```

Open `http://localhost:8080`.

## Deploy

### GitHub Pages

1. Push this repo to GitHub
2. Settings → Pages → Deploy from branch `main` / `/` (root)
3. Site URL will serve `index.html`

If the site is under a project path (`username.github.io/repo/`), relative asset paths already work.

### Cloudflare Pages

1. Create a project → connect the repo (or upload the folder)
2. Build command: _(none)_
3. Output directory: `/` (project root)
4. Deploy

## Privacy

ProtoMap does not upload your schemas. File contents are parsed in-memory in your browser. “Fetch URL” performs a request from your browser to the URL you provide.

## License

MIT
