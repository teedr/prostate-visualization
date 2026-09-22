# Prostate Biopsy Companion · Version 2

Local-first React prototype for turning prostate needle-biopsy pathology text
into a plain-language, visual walkthrough.

Version 2 website: https://prostate-visualization-v2.vercel.app

Original prototype: https://prostate-visualization.vercel.app

## Version 2

- Opens with a basic anatomy orientation, followed by a four-panel pathway from
  PSA blood testing to tissue biopsy, separated specimens, and slide review.
- Parses `.txt` and text-based PDF reports entirely in the browser.
- Summarizes four report-level facts below the specimen explorer: highest
  grade, cancer-bearing specimen groups, documented positive cores, and greatest
  reported core involvement.
- Shows specimen findings in a manually rotatable 3D view by default, with a 2D
  map, simple list, and the original pathology label kept primary.
- Reports coverage for pattern 4, cribriform morphology, and intraductal
  carcinoma so an unstated field is never presented as a report-wide negative.
- Keeps exact report wording available while collapsing secondary detail and
  clinician questions until requested.
- Uses Canary Foundation styling with a logo-only header, red cancer markers,
  a flagged-specimen filter, and accessible “i” explanations for report terms.
- Scans pasted report text for common identifiers and offers a local scrubber.

The parser and 3D positions are intentionally heuristic. Scanned PDFs need OCR,
and the anatomy is educational rather than patient-specific. This prototype
does not diagnose, stage cancer, or recommend treatment.

Medical copy and links use patient-facing material from the
[National Cancer Institute](https://www.cancer.gov/types/prostate/patient/prostate-treatment-pdq)
and reporting guidance from the
[College of American Pathologists](https://documents.cap.org/protocols/Prostate.Needle.Specimen.Bx_1.0.0.1.REL_CAPCP_R.pdf).

The editorial anatomy image and medical comic in `src/assets` were generated
for this prototype. The current comic, `biopsy-process-comic-v6.jpg`, uses a
warm, clinically respectful, text-free four-panel sequence from PSA blood
testing and core extraction to sample handling and slide review.

## Feedback

Use the `Send feedback` link in the app to open a GitHub issue. Do not include names, dates of birth, MRNs, or full real pathology reports in feedback.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm test
npm run build
```

## Publishing

The `version2` branch is the source for the v2 website. Deploy its verified
static build to the separate Vercel project `prostate-visualization-v2`
(`prj_OjUIFiMokIoyVe5QKyTYp4tFa5s0`). Check the project link before deploying:
an existing local `.vercel/project.json` may still point to the original v1
project. Do not publish a v2 update to the v1 project.
