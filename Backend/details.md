# 🚀 Interview AI Master — Backend Architecture & Interview Guide

> **Production-Ready AI-Powered Interview Preparation & Resume Customization Platform**  
> *Engineered with Node.js, Express, MongoDB, Google Gemini 3.6 Flash (Structured Outputs), Puppeteer, and JWT Cookie Authentication.*

---

## 📌 Executive Summary & Project Overview

** Interview AI Master** is an enterprise-grade backend service designed to solve candidate interview readiness challenges. It processes raw candidate resumes (PDF format), job descriptions (JD), and candidate self-descriptions to generate deeply structured, highly personalized interview preparation reports and tailored ATS-friendly resumes.

### Key Capabilities:
1. **Automated Resume Parsing**: In-memory parsing of candidate PDF resumes into plain text using binary buffers (`pdf-parse`).
2. **Structured AI Interview Analysis**: Generates match scores (0-100), targeted technical questions with interviewer intentions & ideal answers, behavioral STAR-format questions, skill gap analysis with severity tags (`low`, `medium`, `high`), and a day-by-day structured preparation roadmap.
3. **Deterministic LLM Output Enforcing**: Guarantees 100% valid JSON responses from LLM calls using `Zod` schemas coupled with Google GenAI's `responseSchema` config (`zod-to-json-schema`).
4. **Dynamic Resume PDF Generation**: Generates ATS-friendly HTML/CSS tailored to specific job descriptions via Gemini, rendered into downloadable A4 PDF binaries using headless Chrome (`Puppeteer`).
5. **Secure Authentication & Token Revocation**: JWT authentication stored in HTTP-Only cookies backed by a database token blacklist for complete logout invalidation.

---

## 🏗️ High-Level System Architecture

```
                                  +---------------------------------+
                                  |         React Frontend          |
                                  +---------------------------------+
                                                   |
                                     HTTP Requests (Cookies Enabled)
                                                   v
+---------------------------------------------------------------------------------------------------+
| Node.js / Express Backend Server (Port 3000)                                                     |
|                                                                                                   |
|  +--------------------------------+       +----------------------------------------------------+  |
|  |     Middleware Layer           |       |                 Controllers Layer                  |  |
|  | - Auth (JWT & Blacklist Check) | ----> | - Auth Controller (Register, Login, Logout, GetMe) |  |
|  | - Multer File Handler (Memory) |       | - Interview Controller (Report Gen, PDF Export)   |  |
|  +--------------------------------+       +----------------------------------------------------+  |
|                                                              |                                    |
|                                                              v                                    |
|                                           +------------------------------------+                  |
|                                           |          Services Layer            |                  |
|                                           | - AI Service (Gemini 3.6 Flash)    |                  |
|                                           | - PDF Service (Puppeteer Engine)   |                  |
|                                           +------------------------------------+                  |
+---------------------------------------------------------------------------------------------------+
                                        |                             |
                       Google GenAI API |                             | MongoDB Atlas
                       (Structured JSON)|                             | (Mongoose ODM)
                                        v                             v
                         +-----------------------+       +-------------------------+
                         |  Google Gemini Model  |       | MongoDB Database        |
                         |  (gemini-3.6-flash)   |       | - Users                 |
                         +-----------------------+       | - InterviewReports      |
                                                         | - BlacklistTokens       |
                                                         +-------------------------+
```

---

## 🛠️ Technical Stack & Architectural Justifications

| Technology | Role | Interview Justification ("Why this tool?") |
| :--- | :--- | :--- |
| **Node.js & Express.js** | Core Runtime & API Framework | Non-blocking, asynchronous I/O event loop makes Node.js ideal for handling file uploads, API orchestration, and streaming PDF binary streams without thread blocking. |
| **MongoDB & Mongoose** | NoSQL Database & ODM | Interview reports contain highly nested, dynamic structures (array of Q&As, skill gap objects, multi-day task roadmaps). A document database eliminates complex SQL joins and normalizations. |
| **Google GenAI (`@google/genai`)** | LLM Engine | Utilizes `gemini-3.6-flash` for ultra-fast response latency, cost-efficiency, and native support for strict JSON schema enforcement via `responseSchema`. |
| **Zod & `zod-to-json-schema`** | Schema Enforcement | Converts TypeScript/JavaScript Zod validation models into JSON Schema standard draft specifications to enforce 100% deterministic JSON output from the LLM. |
| **Puppeteer** | Headless PDF Generator | Renders AI-generated HTML/CSS into pixel-perfect A4 PDF documents with network idle tracking and exact print CSS styling. |
| **`pdf-parse` & `Multer`** | PDF Ingestion Pipeline | `Multer` processes uploads using `MemoryStorage` (avoiding disk I/O latency & file cleanup overhead), passing memory buffers directly to `pdf-parse`. |
| **JWT & `bcryptjs`** | Security & Auth | Password hashing using salt rounds (`10`) and HTTP-Only cookie-based JWT transmission to mitigate XSS (Cross-Site Scripting) vulnerabilities. |

---

## 🗄️ Database Schemas & Data Modeling

### 1. `User` Model (`users` collection)
```javascript
{
  username: { type: String, unique: true, required: true },
  email:    { type: String, unique: true, required: true },
  password: { type: String, required: true } // Hashed with bcryptjs (10 rounds)
}
```

### 2. `BlacklistToken` Model (`blacklistTokens` collection)
```javascript
{
  token: { type: String, required: true },
  timestamps: true // Used for query lookup during auth verification
}
```

### 3. `InterviewReport` Model (`interviewreports` collection)
```javascript
{
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  jobDescription: { type: String, required: true },
  resume: { type: String },
  selfDescription: { type: String },
  matchScore: { type: Number, min: 0, max: 100 },
  technicalQuestions: [{ question: String, intention: String, answer: String }],
  behavioralQuestions: [{ question: String, intention: String, answer: String }],
  skillGaps: [{ skill: String, severity: { type: String, enum: ["low", "medium", "high"] } }],
  preparationPlan: [{ day: Number, focus: String, tasks: [String] }],
  timestamps: true
}
```

---

## 🔑 Key Backend Workflows & Technical Pipelines

### Workflow A: AI Interview Report Generation
1. **Request Upload**: Client sends `POST /api/interview/` with `multipart/form-data` containing `resume` (PDF file), `jobDescription`, and `selfDescription`.
2. **Middleware Interception**: `authMiddleware.authUser` validates JWT token & blacklist state; `upload.single("resume")` buffers file in RAM (`req.file.buffer`).
3. **Text Extraction**: `pdfParse` parses the binary buffer into clean plain text.
4. **Structured LLM Invocation**:
   - Construct prompt integrating Resume Text, Job Description, and Self-Description.
   - Execute `ai.models.generateContent()` with model `gemini-3.6-flash`.
   - Pass `zodToJsonSchema(interviewReportSchema)` inside `config.responseSchema`.
5. **Persistence**: Merges AI payload with user metadata (`req.user.id`) and stores it in MongoDB.
6. **Response**: Returns `201 Created` with full JSON report.

### Workflow B: Tailored Resume PDF Generation & Streaming
1. **Trigger**: Client requests `POST /api/interview/resume/pdf/:interviewReportId`.
2. **Fetch Source Data**: Retrieves original job description, resume text, and self-description from MongoDB.
3. **AI HTML Generation**: Gemini generates raw, ATS-formatted, semantic HTML code containing tailored bullet points.
4. **Puppeteer Render**:
   - Launches headless browser (`puppeteer.launch()`).
   - Creates a clean page and sets HTML content via `page.setContent(htmlContent, { waitUntil: "networkidle0" })`.
   - Renders A4 page to buffer (`page.pdf({ format: "A4", margin: {...} })`).
   - Closes browser instance cleanly.
5. **Binary Stream Output**: Sets headers `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=resume_xxx.pdf` and streams the buffer back to client.

---

## 🎯 Top Interview Questions & Technical Deep-Dives

### Q1: How do you guarantee that the LLM returns structured JSON matching your exact format without failing or hallucinating?
> **Answer**:  
> "We enforce structural guarantees at the API level rather than relying solely on prompt engineering. We define a strict schema using `Zod` and convert it to standard JSON Schema format using `zod-to-json-schema`. We pass this schema directly into Google GenAI's `responseSchema` parameter in the `config` object, setting `responseMimeType: "application/json"`. This forces the Gemini model decoder to constrain its output tokens exclusively to valid JSON structures matching our schema definition."

### Q2: Why did you use Multer's `MemoryStorage` instead of saving uploaded PDFs to disk?
> **Answer**:  
> "Using `MemoryStorage` keeps our backend stateless and eliminates unnecessary disk I/O latency. Since uploaded resume PDFs are small (typically < 5MB), holding the file in RAM buffer (`req.file.buffer`) allows `pdf-parse` to immediately extract text without disk read/write overhead. It also avoids file cleanup maintenance, disk exhaustion risks, and file permission issues in multi-container cloud deployments."

### Q3: How does your authentication handle logout if JWTs are inherently stateless?
> **Answer**:  
> "We implemented a hybrid stateful-stateless authentication strategy using HTTP-Only cookies and a database Token Blacklist (`BlacklistToken` model). Upon logout, the client's token is stored in the `blacklistTokens` collection in MongoDB, and the browser cookie is cleared. Our `authUser` middleware checks every incoming request against the blacklist database before verifying the JWT signature. If a token is blacklisted, access is rejected immediately."

### Q4: Puppeteer is resource-heavy. How did you optimize PDF generation and ensure server reliability?
> **Answer**:  
> "Puppeteer spawns Chromium browser processes which consume memory. To prevent resource leaks:
> 1. We wrap Puppeteer execution in try-finally blocks to guarantee `browser.close()` is invoked even if PDF generation fails.
> 2. We use `waitUntil: "networkidle0"` to avoid waiting indefinitely for external resources.
> 3. In production environments, we pre-install the Chromium binary into local cache to avoid download overhead during cold starts."

### Q5: How do you ensure user data isolation across all endpoints?
> **Answer**:  
> "Data isolation is enforced at the database query layer. The `authUser` middleware extracts and verifies the logged-in user's ID (`req.user.id`). Every single controller query explicitly includes `user: req.user.id` in its MongoDB filter query (e.g., `interviewReportModel.findOne({ _id: interviewId, user: req.user.id })`). This prevents Unauthorized IDOR (Insecure Direct Object Reference) vulnerabilities."

---

## ⚡ 60-Second Elevator Pitch for Interviews

>  Interview AI Master is an AI-powered interview preparation and resume customization platform I built using Node.js, Express, MongoDB, and the Google Gemini API.*  
> 
> *The system takes a candidate's uploaded resume PDF, extracts the text in-memory, and feeds it alongside a Job Description to Gemini 3.6 Flash. Using Zod schemas and Google's `responseSchema` feature, we strictly enforce structured JSON outputs—delivering match scores, targeted technical and behavioral questions with interviewer intentions, skill gap severities, and a personalized multi-day preparation plan.*  
> 
> *Additionally, it generates ATS-optimized custom resumes rendered dynamically into downloadable PDF binaries via Puppeteer. For security, I implemented JWT authentication stored in HTTP-Only cookies with a MongoDB token blacklist for stateful logout revocation."*

---
*Created for Interview AI Master Backend — Ready for Technical Review & Interviews.*
