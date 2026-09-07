# TrueFrame AI

A full-stack web app that checks whether a face in an **image or video** is real or AI-generated, and explains how confident it is — not just a yes/no answer.

Started as a research notebook on cross-generator generalization (can a classifier trained on one type of generated face — e.g. StyleGAN — still catch faces from a different generator, like Stable Diffusion?). This version turns that research into a usable product: sign in, upload, get a verdict, see your history.

---

## Features

- **Image detection** — upload a photo, get a real/fake verdict with a confidence score
- **Video detection** — upload a clip; the backend samples frames across it and aggregates a verdict, with a per-frame confidence breakdown
- **Google sign-in** — each user has their own account
- **History** — every past check is saved with its result, so you can look back at what you've uploaded

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + React Router |
| Backend | Python, FastAPI |
| Database | MongoDB |
| Auth | Google OAuth |
| Model | CLIP (frozen ViT-B/32) + lightweight classifier head |
| Model serving | In-process inside the FastAPI backend (no separate inference service, for v1) |

## Architecture

```
Frontend (React)
      │
      ▼
FastAPI Backend
 ├── /auth/google        (Google OAuth login)
 ├── /predict/image       (CLIP model, in-process)
 ├── /predict/video       (frame extraction → CLIP model per frame → aggregate)
 └── /history             (past uploads + results, per user)
      │
      ▼
MongoDB (users, upload history, results)
```

## The model

- **Backbone**: CLIP ViT-B/32 (frozen), with a lightweight classifier head trained on top
- **Training/validation data**: [140k Real and Fake Faces](https://www.kaggle.com/datasets/xhlulu/140k-real-and-fake-faces) (StyleGAN-generated fakes)
- **Held-out generalization test**: ~9,000 Stable Diffusion-generated faces the model never trains on — this is the real research question: does it generalize across generators, or did it just memorize StyleGAN's specific artifacts?
- **Video approach (v1)**: sample frames from the clip, run each through the image model, aggregate the per-frame scores into one verdict (average confidence + majority vote). A natural v2 upgrade is a temporal model that also looks at motion consistency across frames, since a lot of AI-video artifacts show up as flicker rather than a single bad frame.

## Project status / roadmap

- [x] Design direction chosen (see `/frontend`)
- [x] Frontend skeleton — routes, navbar, upload UI, placeholder auth (this repo)
- [ ] FastAPI backend skeleton + MongoDB connection + Google OAuth
- [ ] Retrain and export the image classification model
- [ ] Wire up `/predict/image`
- [ ] Video frame-sampling pipeline + `/predict/video`
- [ ] Upload history (MongoDB-backed)
- [ ] Evaluation writeup — accuracy, cross-generator results, confusion matrix
- [ ] (Stretch) Grad-CAM / attention visualization — show *why* an image was flagged

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`. Right now the image/video check pages return a fake placeholder result after ~1 second — this will be replaced by real calls to the FastAPI backend once it exists (see the commented-out `fetch` calls in `src/pages/ImageCheck.jsx` and `src/pages/VideoCheck.jsx`).

## Repo structure

```
trueframe-ai/
├── frontend/          # React app (this is what's built so far)
├── backend/           # FastAPI app — not yet built
└── model/             # training notebooks + exported weights — not yet built
```
