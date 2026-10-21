# DECA Prep

DECA Prep turns a text-based DECA practice-exam PDF into an interactive test that runs locally. There are no accounts, cloud database, Supabase project, API keys, or environment variables to configure.

## Data and hosting

- The original PDF, extracted questions, edits, attempts, and results are stored in this browser's IndexedDB database.
- Clearing browser/site data removes the library, so keep the original PDFs as backups.

When running locally, PDF parsing happens in the local Next.js process. When deployed to Vercel, a PDF is sent to the Vercel function for one-time parsing, but the app does not store it in a cloud database. The current Vercel-compatible upload limit is 4 MB.

## Run it

You need a current Node.js LTS release.

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). Import a PDF and start practicing—no sign-up step is involved.

## Supported PDFs

The deterministic parser supports text-based DECA-style exams with numbered multiple-choice questions, A–D options, and an answer or descriptive key. It preserves source page numbers, explanations, and performance indicators when present. Missing keys are shown for review and are never guessed.

Scanned image-only PDFs are intentionally rejected. Run OCR on the PDF first, then import the searchable copy.

## Deploy to Vercel

Import this repository into Vercel and deploy with the default Next.js settings. No environment variables, database, storage bucket, or user accounts are required. The repository includes the PDF.js worker tracing needed by the extraction route.

## Useful commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the supplied sample PDF integration test without copying the PDF into the repository:

```bash
DECA_SAMPLE_PDF_PATH='/Users/ankit/Downloads/deca test.pdf' pnpm test -- sample-pdf.integration
```

## Implementation

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- Dexie/IndexedDB for durable browser-local storage
- PDF.js for server-side text extraction
- Zod for parser and attempt validation
- Vitest for unit and sample-PDF integration tests

The app is intended as a private study tool. Only import documents you are allowed to use.
