# TRUST-EVID AI

**Tagline:** Evidence intelligence for the moments when authenticity matters.

**One-line pitch:** TRUST-EVID AI helps law-enforcement investigators triage digital evidence through explainable forensic signals, file-integrity verification, and a verifiable chain-of-custody record.

---

## 1. Project Overview

TRUST-EVID AI is an AI-assisted digital-evidence triage platform designed primarily for law-enforcement investigators handling cases involving digital evidence. Authorized officers or evidence handlers upload evidence collected during an investigation. The platform registers the files, records provenance details, runs supported forensic checks and AI-assisted analysis, and creates a structured evidence-review package.

The product combines:

1. Secure evidence intake and original-file hashing.
2. Deterministic forensic checks and AI-assisted image/video analysis.
3. Explainable findings that help investigators prioritize files for further examination.
4. A verifiable record of evidence access, review, and transfer.
5. Structured reports for investigator and forensic-examiner workflows.

The MVP is a prototype for controlled demonstrations. It is not an officially deployed system for NCCIA, police departments, courts, or forensic laboratories. It does not independently establish authenticity, guilt, or legal admissibility.

---

## 2. Problem Statement

Investigators may receive large volumes of CCTV footage, images, and videos from different sources. Files may have incomplete metadata, uncertain provenance, or signs that warrant further forensic examination. Manually cataloging files, identifying potential anomalies, and documenting each handoff can consume valuable time.

TRUST-EVID AI focuses on three related problems:

1. **Triage:** Which files contain observable anomalies that may warrant closer examination?
2. **Integrity:** Does the current file match the version registered at intake?
3. **Accountability:** Can an authorized reviewer inspect the recorded history of evidence handling?

A cryptographic hash can help verify that bytes have not changed since a trusted hash was registered, but it cannot prove that a file was genuine before intake. Likewise, AI-assisted analysis can surface signals for review but cannot conclusively determine authenticity in every case.

---

## 3. Users and Responsibilities

### Primary user: Law-enforcement investigator

The investigator is the main user and the person the product is designed around. They create or manage a case, review evidence and analysis results, prioritize files for further examination, inspect the custody history, and prepare an evidence-review package.

Intended users may include authorized NCCIA or police personnel. No official partnership, deployment, or integration is assumed.

### Evidence uploader: Authorized officer or evidence handler

An authorized officer or evidence handler uploads evidence collected during an investigation, records source and collection details, and initiates the custody record. In a small team, the investigator may also perform this role.

The uploader should record relevant provenance details, such as source, collection time, collecting person, and any known transfer history. The system must distinguish information supplied by a user from independently verified facts.

### Secondary user: Digital forensic examiner

A qualified forensic examiner reviews flagged anomalies, examines original evidence using appropriate forensic methods, documents specialist findings, and determines whether further analysis is required. AI findings are advisory and do not replace examiner judgment or an official forensic certificate.

### Evidence source and excluded workflow

The MVP focuses on evidence collected and submitted by an authorized officer or evidence handler as part of an investigation. Victims and complainants are not direct users of the MVP, and the product will not provide public victim-upload accounts or an open submission portal in this version.

A future version may support a separate complainant-submission workflow. Such submissions would be labeled as unverified until reviewed and formally registered by an authorized handler.

---

## 4. Product Goal and Expected Outcome

The goal is to help investigators answer four practical questions:

1. **What evidence has been registered?** A catalog of files linked to a case, including recorded source details and available metadata.
2. **What deserves closer attention?** An explainable assessment of observable anomalies that may justify further examination.
3. **Has a registered file changed?** A hash comparison against the original hash recorded at intake.
4. **What can be handed over for review?** A structured package containing file details, analysis findings, limitations, and recorded custody history.

The platform is an investigative aid. It does not decide guilt, certify evidence as authentic, or determine legal admissibility.

---

## 5. Core User Journey

1. An authorized investigator or officer signs in and completes the configured two-factor authentication flow.
2. The investigator creates or opens a case.
3. An authorized officer or evidence handler uploads an image or supported video collected for that case.
4. The server validates the upload, computes a SHA-256 hash, stores the original in private storage, and records available metadata and source details.
5. The system creates an initial custody event linked to the evidence record.
6. The forensic pipeline extracts applicable metadata and runs supported deterministic checks.
7. The AI integration receives supported visual inputs and structured findings, then returns a structured explanation, potential concerns, limitations, and review guidance.
8. The system saves the results and makes them available on the investigator's case dashboard.
9. The investigator reviews the findings and may mark evidence for specialist examination.
10. A forensic examiner can review the assigned evidence and record examination or review events.
11. The investigator generates a report containing the evidence details, recorded findings, limitations, integrity status, and custody history.
12. Authorized users can later verify the current file hash and inspect the custody record.

The MVP demonstrates this workflow with test accounts and synthetic or otherwise authorized demonstration evidence. It does not assume that an actual government agency is connected to the system.

---

## 6. AI Feature and Technical Approach

### 6.1 Deterministic forensic signal extraction

Deterministic checks run before AI interpretation. Results will be stored separately from model-generated text.

**Images**
- Extract available EXIF and other supported metadata.
- Record dimensions, encoding details, and missing or inconsistent metadata.
- Run selected image checks that are feasible and reproducible in the hackathon timeframe.
- Where supported, provide visual inputs or selected regions for AI-assisted review.

**Videos**
- Extract available container, codec, duration, and timestamp metadata.
- Sample frames at controlled intervals.
- Check for repeated sampled frames and selected continuity anomalies where measurable.
- Provide selected frames and measured findings to the AI analysis pipeline.

Not every file exposes reliable metadata, and ordinary export, editing, or re-encoding can produce anomalies. A missing field or anomaly is not proof of deliberate manipulation.

### 6.2 AI-assisted explanation

A hosted multimodal model will analyze supported visual inputs and structured forensic findings to generate a machine-readable report.

The report will contain:
- A concise summary of the evidence and processing performed.
- Findings grounded in supplied observations.
- Potential anomalies and their locations, where available.
- Uncertainty and plausible alternative explanations.
- Recommended next steps for qualified human review.

The model must not invent forensic measurements or claim to have run checks that the backend did not perform. The application will validate structured outputs and retain deterministic findings separately from AI interpretation.

### 6.3 Evidence risk assessment

The application will present an interpretable review-priority category based on available signals and their limitations. It is a triage aid, not a calibrated probability that a file is fake.

The system will not claim a general detection accuracy or error rate unless the team evaluates the relevant checks against a suitable labeled dataset and reports the methodology and results.

### 6.4 AI failure handling

The application will handle invalid model responses, provider errors, rate limits, timeouts, and unsupported files. It will not silently substitute hardcoded text for a live AI response. If AI analysis fails, deterministic findings may still be shown, with the AI analysis clearly marked incomplete.

---

## 7. Evidence Integrity, Security, and Chain of Custody

### 7.1 Integrity verification

- Compute SHA-256 on the server at intake.
- Preserve the original uploaded file separately from derived analysis artifacts.
- Recompute the hash when verification is requested.
- Compare the current hash with the registered intake hash.
- Show a clear match or mismatch result and the time of verification.

A matching hash means the checked bytes match the registered version, assuming the original hash record is trustworthy. It does not prove that the original file was genuine before intake.

### 7.2 Custody event log

Each evidence lifecycle event will include:
- Case and evidence identifiers.
- Event type and timestamp.
- Authenticated actor identifier.
- Relevant evidence hash.
- Event details and previous-event hash.
- Current-event hash.

Events may include intake, analysis, review, verification, download, and transfer. The application will provide a verification function to check event ordering, hash linkage, and record consistency.

Database permissions and application logic will restrict unauthorized changes. A hash-linked log stored only in one database cannot guarantee resistance to a privileged administrator rewriting the entire history. Independent anchoring or external trusted timestamping is future scope.

### 7.3 Access control and privacy

- Require authentication for case and evidence access.
- Enforce server-side authorization on every case operation.
- Isolate user and case data; apply database row-level security where supported.
- Store original evidence in private storage with controlled access.
- Keep secrets in environment variables.
- Restrict upload types and file sizes.
- Avoid sending unnecessary identifying metadata or raw evidence to third-party AI providers.
- Record security-relevant actions in the audit trail.
- Use synthetic or authorized evidence for demonstrations.

The MVP is a prototype and must not be used to store real sensitive case evidence without an appropriate security, privacy, and operational review.

## 8. MVP Features

### Must have
- Sign-up and sign-in.
- Working two-factor authentication.
- Persistent relational database.
- Case creation and case dashboard.
- Authorized officer/evidence-handler upload flow.
- Image metadata extraction and supported visual analysis.
- Video metadata extraction and frame sampling.
- Live hosted AI call with structured, validated output.
- SHA-256 registration and verification.
- Persistent custody and audit events.
- Saved analysis and case history.
- Downloadable structured evidence-review report.
- Complete responsive user interface and clear processing states.
- Public GitHub repository, README, and this specification.
- Incremental commits and at least two original, documented code gigs, as required by the organizers.

### Explicitly out of scope
- Public victim or complainant upload accounts.
- Direct NCCIA, police, court, or forensic-lab integrations.
- Claims of official agency adoption or partnership.
- Official forensic certification or legal-admissibility decisions.
- Guaranteed deepfake or manipulation detection.
- Training a new forensic foundation model.
- A production blockchain network.
- Mobile applications and browser extensions.
- Offline field intake and delayed synchronization.
- Full investigation of chat exports, emails, audio, and arbitrary documents.
- Production multi-agency deployment.

## 9. Application Architecture

The application will use a modular web architecture:

1. **Frontend:** Responsive case dashboard, evidence intake, analysis results, evidence preview, integrity verification, custody history, and report download.
2. **Backend API:** Authentication enforcement, case management, upload validation, analysis orchestration, report generation, and audit events.
3. **Forensic processing layer:** Metadata extraction, image checks, video frame sampling, hashing, and integrity verification.
4. **AI integration layer:** Hosted multimodal model calls, structured prompts, output validation, and failure handling.
5. **Database:** Persistent records for users, cases, evidence metadata, findings, reports, and custody events.
6. **Private file storage:** Original files and derived artifacts stored separately from relational records.

### Proposed stack
- Next.js and TypeScript for the web application.
- Supabase PostgreSQL and Supabase Auth, with a verified two-factor authentication configuration.
- Private Supabase Storage for evidence files.
- Python and FastAPI for forensic processing if a separate worker service is feasible.
- OpenCV and FFmpeg for applicable image/video processing.
- ExifTool or a suitable metadata library.
- A hosted multimodal AI API chosen according to event credits, model capabilities, and deployment constraints.
- SHA-256 hashing and application-level hash-linked audit records.

The final stack will be confirmed at kickoff. A simpler single-backend deployment is acceptable if it reduces integration risk while preserving mandatory requirements.

---

## 10. Data Model

### User
- `id`
- `email`
- authentication provider identifier
- `created_at`

### Case
- `id`
- `owner_user_id`
- `title`
- `description`
- `status`
- `created_at`
- `updated_at`

### Evidence
- `id`
- `case_id`
- `owner_user_id`
- private storage key
- original filename
- media type
- file size
- `sha256_original`
- extracted metadata
- source and collection details
- `uploaded_at`
- processing status

### Analysis
- `id`
- `evidence_id`
- model provider and identifier
- deterministic findings
- AI summary
- risk/review-priority category
- limitations
- `created_at`

### CustodyEvent
- `id`
- `case_id`
- `evidence_id`
- `actor_user_id`
- event type
- event timestamp
- evidence hash
- previous-event hash
- event hash
- event details

All case, evidence, analysis, and custody queries will enforce server-side authorization. The MVP will support a clear distinction between the uploader, investigator, and examiner where role-based workflows are implemented. No user may gain access to evidence merely by knowing its identifier.

---

## 11. User Interface

The MVP will include:

1. **Authentication:** Sign-up, sign-in, and 2FA setup and verification.
2. **Investigator dashboard:** Cases, evidence counts, processing status, review-priority indicators, and recent activity.
3. **Case details:** Case metadata, evidence list, source details, and custody events.
4. **Evidence intake:** Upload form for authorized officers/handlers, including source and collection details.
5. **Analysis view:** Evidence preview, extracted signals, AI explanation, review priority, limitations, and processing status.
6. **Integrity and custody view:** Registered hash, verification result, ordered event history, and chain-verification status.
7. **Examiner review view:** Findings for assigned or designated evidence, with a way to record review notes or an examination event.
8. **Report view:** Download a structured summary of evidence details, processing results, limitations, integrity status, and custody history.

The interface will distinguish computational results from AI interpretation and human examiner findings. It will not display a generic “authentic” badge merely because no anomalies were detected.

---

## 12. Evaluation and Acceptance Criteria

The MVP will be evaluated through reproducible functional tests:

- A user can register, sign in, and complete 2FA.
- An investigator can create a case and retrieve it after signing out and back in.
- An authorized officer/handler can upload a supported image or video and record source details.
- The server computes and stores the original file hash.
- A supported analysis invokes the hosted AI model and saves its actual structured result.
- A user cannot access another user's cases or evidence.
- Altering a test copy of a registered file causes hash verification to fail.
- Modifying or reordering a custody event causes chain verification to detect the inconsistency.
- Invalid uploads and AI-provider failures produce clear error states.
- A report can be downloaded and distinguishes observed findings, AI interpretation, and limitations.
- An investigator can identify files requiring further review without the system claiming to determine authenticity conclusively.

Where a suitable labeled evaluation set is available, the team may measure false positives and false negatives for specific checks. No broad forensic accuracy claim will be made without appropriate testing.

---

## 13. Three-Day Build Plan

### Day 1 — Foundation
- Initialize the project and public repository.
- Configure authentication, 2FA, database, and private storage.
- Implement case creation and evidence upload.
- Implement server-side hashing and metadata extraction.
- Build the first version of the investigator dashboard.
- Publish incremental commits.

### Day 2 — AI and verification
- Implement image analysis and video frame sampling.
- Integrate the hosted AI model with structured outputs and failure handling.
- Implement saved findings, hash verification, and custody events.
- Build analysis and integrity views.
- Extract and document the first reusable code gig.

### Day 3 — Completion and deployment
- Complete the end-to-end investigator workflow.
- Test authentication, 2FA, and data isolation with separate accounts.
- Complete report generation and custody-chain verification.
- Test persistence, upload failures, and AI-provider failures.
- Deploy the application and finalize documentation.
- Publish the second reusable code gig and verify the final submission.

The team will prioritize one complete, tested workflow over unfinished secondary features.

---

## 15. Risks and Mitigations

**False positives:** Ordinary export, editing, or re-encoding may produce anomalies. Mitigation: report individual signals and limitations rather than asserting manipulation.

**False negatives:** Sophisticated manipulation may evade checks. Mitigation: never describe a clean result as proof of authenticity.

**AI hallucinations:** A model may invent details. Mitigation: ground explanations in recorded findings, validate structured output, and separate AI interpretation from deterministic results.

**Privacy exposure:** Evidence may contain sensitive personal information. Mitigation: private storage, strict authorization, minimal third-party data sharing, and synthetic demo data.

**Scope creep:** Full institutional workflows and multi-format investigations exceed the three-day scope. Mitigation: focus on officer-uploaded images/videos, investigator review, integrity verification, and one complete report workflow.

**API credit exhaustion:** Model access may be throttled or credits exhausted. Mitigation: choose a suitable cost-effective model, minimize unnecessary calls, and display honest failure states without fabricating results.

**Privileged database tampering:** An unanchored hash-linked log can be rewritten by a sufficiently privileged actor. Mitigation: verify chains, restrict write permissions, document this limitation, and treat independent anchoring as future work.

**No institutional integration:** The team may not have access to government systems or real case data. Mitigation: build a self-contained prototype using synthetic or authorized test evidence and make no claims of agency partnership.

---

## 16. Expected Impact

TRUST-EVID AI aims to reduce the manual effort involved in cataloging and reviewing digital evidence, make potentially significant anomalies easier to identify, and improve the transparency of evidence handling.

Its immediate value is a reproducible review workflow for investigators and forensic practitioners. Its longer-term potential is integration with established forensic processes after appropriate technical validation, security assessment, and institutional review.

The platform assists investigation; it does not determine guilt, independently prove authenticity, or replace qualified forensic judgment.

---

## 17. Future Scope

- A separate, controlled complainant-submission flow with explicit unverified status.
- Additional evidence types such as PDFs, chat exports, and audio.
- More specialized and independently evaluated forensic models.
- Better localization of suspected edits and frame-level anomalies.
- Digitally signed reports and independent timestamp anchoring.
- Multi-organization permissions and verified handoff workflows.
- Offline field intake and delayed synchronization.
- Institutional pilots following appropriate legal, privacy, and security review.

---