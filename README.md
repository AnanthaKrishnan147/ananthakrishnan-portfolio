# Anantha Krishnan — Portfolio

A responsive personal portfolio built with HTML, CSS and vanilla JavaScript, served by FastAPI. Its résumé assistant uses the official OpenRouter Python SDK for both chat completions and embeddings.

## Features

- Responsive editorial design using Playfair Display headings and Source Sans 3 body text.
- Profile portrait served from `data/my_image.jpeg`.
- Project case studies, scroll reveals, responsive navigation, reduced-motion support and accessible chat UI.
- Résumé PDF preview/open/download served from `data/cv2.pdf`.
- Retrieval-augmented answers grounded in extracted résumé text, plus general question answering.
- No frontend build step or JavaScript framework.

## Structure

```text
.
├── backend/
│   ├── main.py              # FastAPI routes and app lifecycle
│   ├── rag/
│   │   ├── ingestion.py     # PDF/text extraction and overlapping chunks
│   │   ├── prompts.py       # Personal/general question routing and prompts
│   │   └── retrieval.py     # Cosine similarity ranking
│   └── services/llm.py     # OpenRouter chat completion
├── data/
│   ├── cv2.pdf              # Résumé used by RAG and PDF viewer
│   ├── my_image.jpeg        # Profile portrait
│   └── resume.md            # Older text profile (not the active RAG source)
├── static/
│   ├── index.html
│   ├── styles.css
│   └── js/
├── .env.example
├── requirements.txt
└── README.md
```

## Setup and run

Python 3.10+ is required.

```bash
python -m venv .venv
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` if setting the project up on a new machine. Put your OpenRouter key in `.env`:

```text
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_CHAT_MODEL=openai/gpt-4o-mini
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
```

Never commit `.env`; it is ignored by Git. Restart the server after changing environment variables.

Run from the project root:

```bash
uvicorn backend.main:app --reload
```

Open <http://127.0.0.1:8000>. API documentation is at `/docs`; service status is at `/api/health`.

## RAG flow

At startup, `backend/main.py` opens `data/cv2.pdf` with pypdf, extracts selectable text, splits it into overlapping chunks, then uses OpenRouter embeddings to create vectors. The vectors and chunks are held in memory for the life of the process.

When a personal question arrives, a simple keyword/phrase router selects the profile path. The backend embeds the question with the configured OpenRouter embedding model, ranks the résumé chunks using cosine similarity, and sends the top four matches to the chat model with instructions not to invent personal information. The response contains source labels and excerpts. General questions bypass résumé retrieval.

The index is rebuilt each time the server starts; there is no persistent vector database. Scanned PDFs need OCR, which is not included. To change the résumé, replace `data/cv2.pdf` or set `RESUME_PATH` to another PDF/text/Markdown file, then restart the app.

## Endpoints

### `POST /api/chat`

Request:

```json
{"message":"What projects has Anantha worked on?"}
```

The previous `{"question":"..."}` field is also accepted. Response shape:

```json
{"answer":"...","sources":[{"label":"cv2.pdf","excerpt":"..."}]}
```

General answers return an empty `sources` list. Invalid/empty requests receive a validation error; missing OpenRouter configuration or upstream failures produce a readable error response.

### `GET /api/health`

Reports whether the assistant is configured and whether résumé text was indexed.

### Résumé and image

- `GET /resume.pdf` displays the résumé PDF; `/resume.pdf?download=true` downloads it.
- `GET /resume.txt` downloads the extracted résumé text.
- `GET /profile-image` serves the portrait from `data/my_image.jpeg`.

## Updating your portfolio

- Replace `data/cv2.pdf` with the current résumé. Keep it text-selectable for PDF extraction.
- Replace `data/my_image.jpeg` to change the portrait, or update the `PROFILE_IMAGE` path in `backend/main.py`.
- Update project cards and text in `static/index.html`; update project dialog details in `static/js/main.js`.
- Update personal claims in the profile source as well as visible page copy so the chatbot and site stay consistent.
- Add verified GitHub, LinkedIn and contact URLs in the relevant section of `static/index.html`.

## Deployment

Deploy as an ASGI application, install `requirements.txt`, set `OPENROUTER_API_KEY` and any model overrides in the hosting environment, then run:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Use HTTPS. Keep the API key server-side. The static website and API are served from the same process.
