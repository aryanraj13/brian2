# 🧠 Personal Brain

> Your personal data, made searchable.

Personal Brain is a conversational AI knowledge system that lets you ask
natural-language questions about your personal Gmail and Google Drive data.

Instead of manually searching through emails and documents, Personal Brain
retrieves relevant information from connected sources, stores it in GBrain,
and uses Gemini to produce a grounded conversational answer.

The system is designed around **cross-source reasoning**, allowing it to
combine information from Gmail and Google Drive to answer questions that
require context from multiple sources.

![Hero Section](https://github.com/aryanraj13/brian2/blob/b0632236a2f4917ac9e09c62feba9195287accee/home.png)

---

## 🎥 Demo

**Live Application:**

https://personalbrain-sooty.vercel.app

**Demo Video:**

https://drive.google.com/file/d/1xHL2nifvAtMV--ly8EhZOdDkFFPejPRK/view?usp=sharing

---

## ✨ Features

### Gmail Integration

- Search personal Gmail data.
- Retrieve email subjects, senders, recipients and timestamps.
- Extract email bodies and snippets.
- Detect attachment filenames.
- Preserve links to original Gmail messages.
- Search historical emails within the configured synchronization window.

### Google Drive Integration

- Search personal Google Drive data.
- Retrieve file metadata.
- Retrieve Google Docs content.
- Preserve links to original Drive files.
- Include Drive documents in cross-source reasoning.

### 🧠 GBrain Integration

- Stores normalized Gmail and Drive data in GBrain.
- Uses GBrain as the primary retrieval engine.
- Supports semantic retrieval over personal data.
- Stores data in PostgreSQL through GBrain.
- Maintains a dedicated `personal-brain` source.

### 🤖 Gemini Answer Synthesis

- Converts retrieved context into conversational answers.
- Combines information from multiple sources.
- Answers questions using the user's actual data.
- Avoids relying on raw search results as the user-facing response.

### 🔗 Cross-Source Reasoning

Personal Brain can correlate information across Gmail and Google Drive.

For example:

> Did I send my resume to Varp TechLabs, and what happened afterward?

The system can combine:

- Gmail → resume email
- Gmail → recruiter response
- Drive → corresponding resume document

and produce one consolidated answer.

### 🔐 Google Authentication

- Google OAuth authentication.
- Protected chat interface.
- Server-side access to Google APIs.
- OAuth refresh token used for synchronization.

### ☁️ Production Deployment

- Next.js application deployed on Vercel.
- GBrain server deployed on Render.
- PostgreSQL used by GBrain for persistent storage.
