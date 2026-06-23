# CrisisConnect — Page-by-Page Usage Guide

All pages are listed in **sidebar order** by section. Password for all demo accounts: **`Test1234!`**

---

## Demo Login Accounts

| Role | Email |COMPLETELY 
|---|---|
| Admin | `emma.admin@crisisconnect.com` |
| Government | `priya.gov@crisisconnect.com` |
| NGO | `sofia.ngo@crisisconnect.com` |
| Volunteer | `carlos.vol@crisisconnect.com` |
| Citizen | `tom.citizen@crisisconnect.com` |

> On the login page, click any row in the **"Demo accounts — click to fill"** panel to auto-fill credentials.

---

## Section 1 — Emergency Ops

### 1.1 Dashboard (`/dashboard`)

The main landing page after login. It is **role-aware** — the layout and content change completely depending on who is logged in. There is no single shared dashboard; each role gets its own product surface.

| Role | What they see |
|---|---|
| **Citizen** | SOS-first layout — a prominent SOS button, a feed of nearby reports, and quick access to Submit Report. Calm, minimal design to reduce panic. |
| **Volunteer / NGO** | Task queue dashboard — pending resource requests, verification tasks, accept/complete workflow for field assignments, and supply-demand statistics. |
| **Government / Authority** | Forced dark-mode command center — a full-screen Leaflet map taking 2/3 of the screen, live incident feed, event timeline, and dispatch action buttons on the right panel. |
| **Admin** | Redirects to `/admin` — the full administration control panel. |

**Key features:**
- Live incident count badge in the header updates in real time via WebSocket
- Government view enters "command mode" automatically when critical incidents are detected (darker contrast, heightened visual state)
- Statistics cards at the top show role-relevant KPIs (e.g., active incidents for authorities, pending tasks for volunteers)

---

### 1.2 Active Reports (`/reports`)

A real-time feed of all emergency incidents across the platform, showing every report submitted by any user. Designed for responders who need to monitor and triage incoming events.

**What you see:**
- A searchable, filterable grid of disaster report cards, each showing: title, location, type badge, severity badge (Critical / High / Medium / Low), timestamp, verification count, AI confidence score, and current status
- Reports update live as new ones come in or existing ones are verified

**Filters available:**
- **Severity:** Critical, High, Medium, Low (toggle any combination)
- **Status:** Reported, Verified, Responding, Resolved
- **Search:** Full-text search across title, location, and description

**Actions you can take:**
- **Upvote** — Community verification; adds your vote to the report's trust score
- **Confirm / Unconfirm** — Official verification available to Volunteers, NGOs, and Admins; raises the report's authority score
- **View Details** — Opens the full report page (`/reports/:id`) with AI explainability, media, timeline, and command actions
- **Retry** — If the feed fails to load, a retry card appears with a 15-second auto-countdown

**Who can use it:** All logged-in roles. Actions available vary by role (citizens can upvote; officials can confirm).

---

### 1.3 Interactive Map (`/map`)

A full-screen operational map for situational awareness. Shows all active incidents, SOS alerts, shelters, evacuation zones, and risk areas geographically.

**Map layers (toggleable from the top bar):**
- **Incident Markers** — Color-coded by severity; red = critical, orange = high, yellow = medium, green = low
- **Heatmap Overlay** — Density view showing hotspots of activity
- **Shelters** — Safe refuge locations
- **Evacuation Zones** — Highlighted polygons showing recommended evacuation areas
- **Roads** — Key transit routes for responders
- **Risk Circles** — AI-calculated risk zones from the geo-intelligence engine

**Controls:**
- **Timeline Slider** — Scrub back in time to see how incidents evolved
- **Filter Bar** — Filter by 13 disaster types (Flood, Fire, Earthquake, Storm, etc.) and severity
- **Layer Toggle** — Switch individual map layers on/off

**Incident Panel (right side):**
When you click any marker on the map, a right-side panel slides open showing:
- SLA timer (how long since the incident was reported)
- AI confidence score bar
- Verification count
- 4 command buttons: **Dispatch**, **Broadcast**, **Full Report**, **Upvote**
- Route polylines overlay on the map when a dispatch is made

**Who can use it:** All roles. Command buttons (Dispatch, Broadcast) are only active for NGOs, Government, and Admins.

---

### 1.4 Submit Report (`/submit`)

A 4-step guided wizard for reporting an emergency. Designed to be fast and usable under stress.

**Step 1 — Type:**
- Select from 13 disaster types: Fire, Flood, Earthquake, Storm, Road Accident, Epidemic, Landslide, Gas Leak, Building Collapse, Chemical Spill, Power Outage, Water Contamination, Other
- Select severity: Low, Medium, High, Critical

**Step 2 — Location:**
- Click **"Capture GPS"** to auto-fill your exact coordinates from your device's GPS
- Or type a location name manually
- Latitude and longitude fields are shown and editable

**Step 3 — Details:**
- Write a title and description of what is happening
- Upload photos or videos (up to 5 files, 10 MB each) using the file uploader
- Record a voice note using the built-in voice recorder
- Uploaded files appear as a list with remove buttons

**Step 4 — Review & Submit:**
- See a full summary of everything you've entered
- Submit the report — it is immediately broadcast to all monitoring users via WebSocket
- After submission, you are redirected to your report's detail page

**Who can use it:** All roles. Citizens are encouraged to use this as their primary contribution.

---

### 1.5 My Reports (`/my-reports`)

A personal history page showing only the reports you have submitted. Useful for tracking whether your reports have been verified, responded to, or resolved.

**What you see:**
- Your reports shown as cards with the same information as Active Reports (title, type, severity, status, timestamp)
- A search bar to filter your own reports
- Live status updates — you can see when your report changes from "Reported" → "Verified" → "Responding" → "Resolved" in real time

**Empty state:**
If you haven't submitted any reports, a prompt with a "Submit New Report" button is shown.

**Actions:**
- Search and filter your own reports
- Click any card to view the full report detail page
- Use "Submit New Report" to go to the submission wizard

**Who can use it:** All roles (each user only sees their own reports).

---

## Section 2 — Response & Aid

### 2.1 Volunteer Hub (`/volunteer`)

The primary coordination dashboard for volunteers and NGOs. Gives an overview of demand vs. supply and provides tools for matching resources to requests.

**Stats at the top:**
- Pending Resource Requests
- Available Resources (from your offers)
- Fulfillment Rate (% of requests matched)
- A Demand-Supply progress bar showing the current gap

**Three tabs:**

**Requests tab:**
- List of urgent resource requests from citizens that need fulfillment
- Each card shows: what is needed, quantity, urgency level, location, and how long it has been pending
- Click to navigate to the request detail and offer your help

**My Offers tab:**
- All the aid offers you have created
- Shows status of each offer: Pending, Matched, Delivered
- Quick stats on how many of your offers are active vs. completed

**Verification tab:**
- Reports that need official confirmation from qualified responders
- Shows community vote counts and AI confidence score
- You can Confirm or Reject each report

**Who can use it:** Volunteer and NGO roles primarily. Citizens can view but have limited actions.

---

### 2.2 Aid Matching (`/aid-matching`)

Manages the full lifecycle of an aid transaction — from matching an offer to a request through to confirming delivery.

**What you see:**
- Three tabs: **Pending Approval**, **Active Commitments**, **Completed**
- Each match card shows a side-by-side comparison of "Your Offer" vs. "Their Request"
  - Resource type, quantity, location, contact info
  - AI-generated match reasoning ("Why this match?")
  - Location proximity in kilometres

**Actions:**
- **Approve & Commit** — Formally link your offer to a specific request; the requester is notified
- **Mark as Delivered** — Confirm that you have delivered the aid to the recipient; closes the transaction and updates fulfillment stats
- **Reject Match** — Decline a suggested match if it is not suitable

**Who can use it:** Volunteers and NGOs managing their active aid offers.

---

### 2.3 Matching Engine (`/matching-engine`)

An administrative interface for monitoring and controlling the AI-powered batch matching system that automatically pairs resource requests with available offers.

**What you see:**
- Global match rate (% of requests successfully matched)
- Supply vs. Demand bar charts broken down by resource type (Water, Food, Medical Supplies, Shelter, etc.)
- "Attention Required" alerts for specific resource shortages (e.g., "50 units of Water needed, only 10 available")

**Actions:**
- **Run Batch Matching** — Manually trigger the AI matching algorithm across all unmatched requests and offers
- **Refresh Analytics** — Update the supply/demand charts

**Who can use it:** NGO and Admin roles.

---

### 2.4 Resource Requests (`/resource-requests`)

A comprehensive list of all aid requests submitted by citizens — covering food, water, medical supplies, shelter, clothing, and more.

**Two tabs:**
- **All Requests** — Every open request across the platform
- **My Requests** — Only the requests you submitted

**Each request card shows:**
- Resource type with icon
- Quantity needed and unit
- Urgency level badge
- Location
- Current workflow stage shown as a progress bar: Request → Approval → Delivery
- Who has been assigned to fulfill it (if any)

**Actions:**
- **Submit New Request** — Opens a form to request a specific resource
- **Mark as Fulfilled** (volunteers) — Confirm you have delivered the resource
- **Cancel** (request owners) — Cancel a pending request you no longer need

**Who can use it:** Citizens (to request), Volunteers and NGOs (to find and fulfill requests).

---

### 2.5 Resource Management (`/resource-management`)

An inventory control system for organizations to track their stockpiles and receive low-stock alerts.

**What you see:**
- Stats: Total Items in inventory, Low Stock Alerts count, Total Units across all items
- A filterable table of all inventory items showing: Name, Category, Quantity, Unit, Location/Warehouse, Status (Healthy / Medium / Low Stock)
- Low stock items are highlighted in amber/red

**Actions:**
- **Add Item** — Dialog form to add a new inventory item with name, category, quantity, unit, location, and minimum threshold
- **Delete** — Remove an item from the inventory
- **Set Threshold** — Define the quantity below which a "Low Stock" alert is triggered
- **Filter** — Filter by category type

**Who can use it:** NGO and Admin roles.

---

### 2.6 Response Teams (`/teams`)

A directory of all emergency response teams and a coordination center for managing memberships.

**What you see:**
- Stats: Total Teams, Total Members, Active Incidents, Teams Currently Deployed
- Team cards showing: team name, leader/commander, specialty badges (Medical, Relief, Search & Rescue, Logistics), member count, active incident count, status (Active / Standby)

**Actions:**
- **Create Team** — Form to create a new response team with a name, description, and specialty area
- **Join Team** — Request to join an existing team
- **View Team Details** — Opens a detail view showing all members and current assignments

**Who can use it:** Volunteer, NGO, and Government roles.

---

### 2.7 Broadcast Alerts (`/broadcast-alerts`)

An emergency alert system that sends instant notifications to all platform users simultaneously via WebSocket. Used for mass communication during crises.

**What you see:**
- A composition panel on the left
- A live list of currently active alerts on the right, showing who sent them, when, and when they expire

**Composing an alert:**
- **Title** — Short headline
- **Message** — Full alert text
- **Severity** — Info (blue), Warning (amber), Critical (red)
- **Scope** — Global (all users) or Regional (specific area)
- **Expiration** — Optional timer after which the alert auto-dismisses

**Actions:**
- **Send Alert** — Immediately broadcasts to all connected clients; appears as a banner across every user's screen within seconds
- **View Active** — See all currently live alerts and their remaining time

**Who can use it:** NGO and Admin roles only.

---

## Section 3 — AI & Intelligence

### 3.1 Analytics (`/analytics`)

A platform-wide performance dashboard providing summary statistics and trend charts for all reports and resources.

**Stats shown:**
- Total reports submitted, verified, and resolved
- Resource requests created vs. fulfilled
- Aid offers submitted vs. delivered
- Average response time

**Charts:**
- **Disaster Type Frequency** — Bar chart of how often each of the 13 disaster types appears
- **Severity Distribution** — Pie chart of Critical / High / Medium / Low breakdown
- **Top Affected Locations** — Ranked list with progress bars showing most impacted areas

**Actions:**
- Switch between "Disaster Frequency" and "Geographic Impact" tabs
- **Export** — Download the current data as JSON or CSV for offline analysis

**Who can use it:** All roles.

---

### 3.2 Intelligence (`/intelligence`)

An advanced AI-driven monitoring hub with 7 analysis tabs covering system health, SLA compliance, peak hours, seasonal patterns, resource efficiency, incident funnels, and user cohorts.

**Top stats:**
- Active Reports, Active SOS Alerts, Total Users, Detected Anomalies (with live anomaly banner if active)

**Tabs:**

| Tab | What it shows |
|---|---|
| **Overview** | System status, live anomaly alerts, and high-level KPIs |
| **SLA** | SLA compliance rate (%), average response time (seconds), response time distribution |
| **Peak Hours** | 24-hour heatmap showing which hours of the day have the most incidents, weighted by severity |
| **Seasonal** | Monthly incident distribution over the year with the top disaster type per month |
| **Resources** | Resource fulfillment rate, aid match rate, and inventory alert counts |
| **Funnel** | 5-stage incident conversion funnel: Submitted → Verified → Resources Requested → Dispatched → Resolved, with % conversion at each stage |
| **Cohorts** | User cohort analysis: New (<7 days), Recent (7–30 days), Regular (30–90 days), Established (90+ days); shows role breakdown and engagement rates |

**Who can use it:** Admin and Government roles.

---

### 3.3 AI Copilot (`/copilot`)

A RAG (Retrieval-Augmented Generation) powered assistant that gives immediate, structured guidance for any emergency scenario. Built on NDRF guidelines and medical protocols.

**How to use it:**
1. Select an **Emergency Type** from the dropdown (13 types available)
2. Choose **Severity** (Low / Medium / High / Critical)
3. Enter a **Location** or describe the situation
4. Select **Language** (English or Hindi)
5. Click **Get Guidance**

**What you get back:**
- **Immediate Actions** — A numbered list of what to do right now, in priority order
- **Medical Guidance** — First aid steps relevant to the emergency type
- **Evacuation Protocol** — Where to go and how to get there safely
- **Local Emergency Contacts** — Phone numbers for police, ambulance, fire, and disaster management
- **Do NOT** warnings — Common mistakes that make situations worse
- **Government Guidelines** — Official protocol references

**Quick Test Scenarios:**
Pre-configured test buttons for common scenarios (Flood in Mumbai, Earthquake, Gas Leak) so you can see the output without filling the form.

**Who can use it:** All roles.

---

### 3.4 Risk Map (`/risk-map`)

A geo-intelligence tool for visualizing historical incident density as colored risk zones and calculating safe travel routes that avoid high-risk areas.

**Map display:**
- **Risk Circles** — Colored overlays: green (very low), yellow (low), orange (medium), red (high), dark red (very high)
- Hovering a circle shows: risk score (1–100), incident count, contributing factors (e.g., "3 floods, 1 earthquake in last 30 days")

**Risk Zone Table (below map):**
- A ranked table of the highest-risk zones with their coordinates, risk score, and incident count

**Route Optimizer panel:**
- Enter a start point (lat/lon) and end point (lat/lon)
- Click **Calculate Route** — the system finds a path that detours around high-risk zones
- The safe route is drawn as a polyline on the map
- Shows estimated distance and travel time

**Who can use it:** Volunteer, NGO, Government, and Admin roles.

---

### 3.5 AI Audit (`/explainability`)

A transparency tool for reviewing every AI decision the system has made — what data it used, how confident it was, and why it reached its conclusion.

**Left sidebar — Decision List:**
- Paginated list of all AI decisions, each showing: report ID, fused priority (Critical / High / Medium / Low), confidence %, and a "suspicious" flag if the fake-detection score is high
- Click any row to load the full breakdown on the right

**Right panel — Decision Intelligence:**
- **Signal Radar** — A 4-axis radar chart showing the contribution of each signal: AI Urgency (50%), Location Risk (20%), Repetition Score (20%), User Trust (10%)
- **Contributing Factors** — Horizontal bars showing each factor's weight and direction (green = increases urgency, red = decreases it), sorted by impact
- **Classification tab** — Urgency level, detected intent, fake detection score, and fused priority label
- **Audit Trail tab** — Audit ID, timestamp, model version, and confidence score for the permanent record

**Who can use it:** Admin and Government roles.

---

### 3.6 Multimodal AI (`/multimodal-ai`)

A testing playground for the multi-signal fusion engine. Combines text, voice transcript, and image data into a single unified urgency assessment.

**Input signals:**
- **Text** (40% weight) — Description of the emergency in free text
- **Voice Transcript** (30% weight) — Paste a transcript of a voice recording
- **Image URL** (30% weight) — URL of an image related to the incident

**Output:**
- Primary crisis type detected
- Overall urgency score and confidence %
- Weighted breakdown of each signal's contribution
- Explainable reasoning for the final score
- If confidence is below threshold: a **"Request Human Review"** button appears

**Who can use it:** NGO, Government, and Admin roles.

---

## Section 4 — Top 1% Platform

### 4.1 Decision Engine (`/decision-engine`)

The central orchestration hub where AI-generated operational actions are queued for human review before execution.

**What you see:**
- **System Flow Diagram** — Visual showing how a report flows from ingestion → AI analysis → decision → execution
- **Decision Feed** — Cards for each pending action (Dispatch Responder, Escalate to Authorities, Send Broadcast) showing AI reasoning and confidence
- **Response Efficiency Panel** — Metrics on average decision time, approval rate, and time-to-action
- **Incident Relationship Graph** — D3-powered visualization showing which incidents are related to each other (by location, type, and timing)

**Actions:**
- **Approve** — Execute the AI-recommended action immediately
- **Reject** — Decline the action and add a reason to the audit log
- Explore the graph to understand incident clusters

**Who can use it:** Government and Admin roles.

---

### 4.2 Simulation Engine (`/simulation`)

A stress-testing tool that injects synthetic emergency events into the live system to evaluate how well the platform responds.

**Configuration:**
- **Scenario Type** — Mass Casualty, Urban Flood, Industrial Accident, Earthquake Cascade, etc.
- **Location** — Where to simulate the events
- **Intensity** — Scale of the simulation (number of simultaneous events)
- **Event Count** — How many synthetic reports/SOS alerts to inject

**Running a simulation:**
1. Configure the scenario
2. Click **Run Simulation**
3. Watch the system process the injected events in real time

**Scorecard (after simulation):**
- Events injected
- Reports created automatically
- SOS alerts triggered
- Estimated affected population
- Overall response score (how quickly the system reacted)

**Run History:**
A log of all past simulations with their configurations and scores for comparison.

**Who can use it:** Admin only.

---

### 4.3 Digital Twin (`/digital-twin`)

A graph-based simulation of city infrastructure. Models how a crisis would propagate through a city's nodes (hospitals, shelters, roads, utilities) and identifies bottlenecks.

**What you see:**
- **City Node Map** — A visual graph of city infrastructure nodes connected by edges (based on Mumbai's district layout)
- Each node is color-coded by type: Hospital, Shelter, Police, Fire Station, Utility

**Running a propagation:**
1. **Seed City Model** — Initialize the city graph
2. Select a **Crisis Origin** node (where the disaster starts)
3. Click **Run Propagation** — the simulation spreads the crisis through connected nodes based on capacity and proximity
4. View which nodes are affected, overwhelmed, or isolated

**Results:**
- Affected node count
- Predicted response time (minutes)
- Estimated population at risk
- Identified infrastructure bottlenecks (nodes that, if disabled, collapse the network)
- Nearest available responder travel times

**Who can use it:** Admin and Government roles.

---

### 4.4 AI Override (`/ai-override`)

A human-in-the-loop interface for reviewing and correcting AI classifications that appear to be wrong.

**What you see:**
- **Override Stats** — Override Rate (% of AI decisions modified by humans), Pending Reviews count, Total Overrides applied
- **Decision List** — All AI decisions flagged for review with original AI classification shown
- Each row: report title, AI-assigned severity/type, confidence score, flag reason

**Override workflow:**
1. Click **Review** on any flagged decision
2. An **Override Dialog** opens showing the original AI output vs. the report details
3. Change the severity, type, or both
4. Enter a reason for the override (required for audit trail)
5. Click **Apply Override** — the system updates the report and logs the human correction

**Who can use it:** Admin and Government roles.

---

### 4.5 AI Governance (`/governance`)

A high-level compliance dashboard for monitoring how the AI system is behaving and ensuring human oversight is maintained.

**What you see:**
- **Active Rule Banner** — Current governance rule (e.g., "Confidence < 75% requires human approval before dispatch")
- **AI Decision Log** — Scrollable list of all AI decisions with their outcomes, timestamps, and confidence scores
- **Human Intervention Audit Trail** — Who approved or rejected what, when, and why

**Metrics:**
- Total AI decisions made
- Average system confidence %
- Override rate
- Compliance score

**Actions:**
- Filter decision log by date range, decision type, or confidence band
- Click any log entry to view full details
- **Jump to Override Console** — Quick link to `/ai-override` for immediate corrections

**Who can use it:** Admin and Government roles.

---

### 4.6 Policy Engine (`/policy-engine`)

A low-code rule builder for defining dynamic system behaviors using IF → THEN logic — no coding required.

**Rule structure:**
- **Condition** — e.g., `severity == "critical" AND type == "flood"`
- **Action** — e.g., `notify_authorities` or `auto_dispatch`
- **Priority** — Rules are ranked; higher priority rules run first

**Creating a rule:**
1. Click **New Rule**
2. Define the condition using dropdowns and value inputs
3. Choose the action to trigger
4. Set the priority level
5. Click **Save Rule**

**Active Rules list:**
- All rules shown with drag handles to reorder priority
- Toggle switch to enable/disable each rule without deleting it
- Stats per rule: trigger count, last triggered timestamp, success rate

**Rule Test Simulator:**
- Paste a JSON context (mock report data) and click **Test**
- See which rules would fire and what actions would be triggered

**Who can use it:** Admin only.

---

### 4.7 Data Fusion (`/data-fusion`)

An observability panel showing how diverse signal sources (IoT sensors, social media, weather APIs) are ingested and fused into unified incident records.

**Source health indicators:**
- Each data source listed with status: Live (green), Degraded (amber), Down (red)
- Sources include: IoT Sensor Network, Social Media Monitor, Weather API, USGS Seismic Feed, Manual Reports

**Fusion Result cards:**
- Each fused incident shown with: overall confidence score, number of signals fused, signal types that contributed
- Expand any card to see the individual raw signals (e.g., specific sensor reading, tweet content, weather data point)
- AI explanation of why these signals were grouped together

**Architecture banner:**
- Visual diagram of the ingestion pipeline from raw signal → normalization → fusion → incident creation

**Who can use it:** Admin and Government roles.

---

### 4.8 Executive View (`/executive`)

A high-density, single-screen status dashboard designed for senior leadership to get a full city-wide picture at a glance — no clicking required.

**Top status banner:**
- City Status badge: **STABLE** (green) / **ELEVATED** (amber) / **CRITICAL** (red)
- Changes automatically based on active incident count and severity

**KPI cards:**
- Active Incidents (with trend arrow)
- SLA Compliance % (target: 85%)
- Average Response Time (minutes)
- Resources Deployed
- Citizens Assisted

**Charts:**
- **7-day Area Trend** — Area chart showing incident volume over the past week
- **Severity Breakdown** — Horizontal bars showing distribution by severity level
- **Response Time Distribution** — How quickly incidents are being addressed

**Drill-down:**
Click any KPI card to open a modal listing the specific incidents or records behind that number.

**Who can use it:** Government and Admin roles.

---

### 4.9 Data Governance (`/data-governance`)

A privacy and compliance management hub for monitoring GDPR compliance and managing data retention policies platform-wide.

**What you see:**
- **Consent Coverage KPIs** — % of users who have given consent for each category
- **GDPR Score** — Overall compliance score out of 100

**Tabs:**

| Tab | What it shows |
|---|---|
| **Consent Categories** | Bar chart of grant rates for: Data Processing, Location Tracking, Analytics, Communications, Third-Party Sharing |
| **User Consent Sidebar** | Per-user consent history with timestamps, IP addresses, and consent version numbers |
| **Data Retention Policies** | Table of how long each data type is kept (SOS alerts: 2 years, Reports: 5 years, Logs: 90 days) with legal basis |

**Who can use it:** Admin only.

---

### 4.10 API Analytics (`/api-analytics`)

A developer-focused dashboard for monitoring API usage, performance, and webhook health.

**Platform stats:**
- Total API Requests (lifetime)
- Error Rate %
- Average Latency (ms)
- P95 Latency (ms)
- Requests per minute (live)

**Daily Request Trend chart:**
- Line chart showing API call volume per day for the past 30 days

**API Key Ranking:**
- Table of all API keys sorted by usage
- Each row shows: key prefix, tier (Free / Paid / Enterprise), requests today, daily limit, and utilization %

**Webhook Health panel:**
- List of registered webhooks with delivery success rate
- Failed delivery count and last failure reason

**Who can use it:** Admin and Developer roles.

---

### 4.11 Async Pipeline (`/async-pipeline`)

Technical observability for the backend job queue and AI processing pipeline. Shows whether the system is keeping up with incoming work.

**Architecture diagram:**
- Visual flow showing: Report Ingestion → Queue → AI Worker → Signal Fusion → Incident Update → WebSocket Broadcast

**Queue KPIs:**
- Current Queue Depth (jobs waiting)
- Processing Concurrency (workers running)
- Average AI Analysis Latency (ms)
- Job Success Rate %
- Active WebSocket Channels

**Recent AI Jobs feed:**
- Live scrolling list of completed AI analysis jobs
- Each entry: report ID, analysis type, duration, and result (success / failed)

**Who can use it:** Admin only.

---

### 4.12 Adaptive Fusion (`/adaptive-fusion`)

A machine learning dashboard for the self-correcting signal weight model. The model learns from human overrides and feedback to improve its fusion weights over time.

**What you see:**
- **Learning Loop Architecture banner** — Diagram showing how human override labels feed back into the model
- **Current Weight Vector** — Live display of the model's current learned weights for each signal (AI Urgency, Location Risk, Repetition Score, User Trust)

**Model metrics:**
- Model Version number
- Training Sample Count
- F1 Score (accuracy measure)
- Precision and Recall rates

**Model Simulator:**
- Enter custom signal values (0–1 for each of the 4 components)
- Click **Simulate** to see how the current model would classify that combination
- Useful for understanding model behavior before it changes a live decision

**Outcome Feed:**
- Recent human-labeled outcomes (Correct / Incorrect) that are being used to retrain the model
- Each label shows the original AI decision and what the human said the correct answer was

**Who can use it:** Admin only.

---

## Section 5 — Administration

### 5.1 Organizations (`/organizations`)

A multi-tenant management portal for creating and managing organizations — NGOs, government agencies, private networks, UN agencies, and military groups.

**Stats at the top:**
- Total Organizations, Verified Organizations, Active Organizations, My Memberships count

**Organization cards show:**
- Organization name and type badge
- Description and region
- Contact email, phone, and website
- Verification badge (✓ Verified or unverified)
- Active/Inactive status

**My Memberships panel (right side):**
- Organizations you belong to with your role in each (Owner, Admin, Member, Observer)

**Actions:**
- **Create Organization** — Dialog form with: Name, Type, Description, Contact Email, Contact Phone, Website, Region
  - Submitting auto-adds you as the Owner member
- **Browse** — View all organizations and their details
- **Manage Members** (owners/admins) — Add or remove members and assign roles

**Who can use it:** All roles can view. NGO, Government, and Admin roles can create and manage.

---

### 5.2 Trust & Fraud (`/trust`)

An administrative dashboard for monitoring system integrity by detecting anomalous user behavior and flagging potential fraud.

**KPI cards:**
- Active Anomalies detected
- High-Risk Users (score ≥ 70)
- Critical Users (score ≥ 90)
- Last Check timestamp (when the system last ran its behavioral analysis)

**Two tabs:**

**System Anomalies tab:**
- Lists unusual patterns detected across the platform (e.g., "Sudden spike: 47 reports submitted in 10 minutes from the same IP range")
- Each anomaly shows: type, description, affected area, timestamp, and affected report count

**High-Risk Users tab:**
- Users flagged by the behavioral analysis engine
- Each user shows: name, email, anomaly score (0–100) as a progress bar, anomaly flags (e.g., "excessive_submissions_24h", "extreme_location_variance"), and their Trust Badge level
- Trust Badge levels: Unverified → Trusted → Verified Responder → Elite Responder

**Who can use it:** Admin only.

---

### 5.3 Developer Platform (`/developer`)

A hub for third-party integration — provides API key management, webhook registration, and interactive API documentation.

**Three tabs:**

**API Keys tab:**
- List of all your API keys with: key prefix (last 4 chars shown), tier (Free / Paid / Enterprise), creation date, status (Active / Revoked)
- Usage meter: "X requests today / Y daily limit"
- **Create New Key** — Generates a key; the full secret is shown once only
- **Revoke** — Permanently disable a key

**Webhooks tab:**
- Registered endpoint URLs with the events they subscribe to
- Event types: `crisis.created`, `sos.created`, `sos.dispatched`, `report.verified`, `alert.broadcast`
- Delivery success rate and recent failure log per webhook
- **Register Webhook** — Add a new endpoint URL and select subscribed events
- **Test** — Send a test payload to verify the endpoint is reachable

**API Docs tab:**
- Interactive reference documentation for the public API v1
- Endpoints listed with method, path, description, required parameters, and example responses
- Key endpoints: `POST /v1/crisis/report`, `GET /v1/sos/active`, `POST /v1/resources/request`

**Who can use it:** All roles (for reading docs); key/webhook management requires an account.

---

### 5.4 Monitoring (`/monitoring`)

Deep system observability for real-time health monitoring, performance metrics, and resilience testing.

**KPI grid (live, updates every 5 seconds):**
- Total Requests processed
- Error Rate %
- Average Response Time (ms)
- P95 Response Time (ms)
- Requests per minute
- System Uptime

**Four tabs:**

**Health Checks tab:**
- Status of each system component: Database (PostgreSQL), Cache (Redis/in-memory), AI Service (OpenAI), Geo Engine, WebSocket Server
- Each shows: status (ok / degraded / down), latency, and last checked timestamp

**Circuit Breakers tab:**
- External integration circuit breakers — show OPEN (failing) or CLOSED (healthy)
- Failure count and last failure time for each integration

**Chaos Engineering tab:**
Controls to deliberately inject failures for resilience testing:
- **High Latency** — Adds 2–5 second delays to all responses
- **Error Rate** — Makes 30% of API calls return 500 errors
- **Memory Pressure** — Allocates memory to simulate RAM exhaustion
- **Slow DB** — Adds latency to database queries
- Click **Run** to activate an experiment, **Stop** to end it

**Prometheus Metrics tab:**
- Raw Prometheus-format metrics output for integration with external monitoring tools (Grafana, Datadog, etc.)

**Who can use it:** Admin only.

---

## Section 6 — Personal

### 6.1 Messages (`/chat`)

A real-time operational chat system for coordination between responders, NGOs, government officials, and other users.

**Left sidebar — Room List:**
- Group channels (named rooms for incident coordination)
- Direct Messages (DMs with specific users; auto-creates a shared room)
- Unread count badges per room
- Priority/critical message indicators

**Message area:**
- **Virtualized message list** — Only visible messages are rendered, keeping performance high even in busy rooms with thousands of messages
- Each message shows: sender name, avatar, timestamp, delivery status (Sent → Delivered → Read), and message text
- **Read receipts** — Checkmark icons show when a message was delivered and read
- **Priority messages** — Highlighted in amber for urgent operational messages

**Pinned Bar (top of chat):**
- Quick access to pinned messages in the current room
- Shows pinned message preview; click to jump to it in the history

**Quick Actions toolbar:**
- Pre-defined rapid response buttons for common operational phrases (e.g., "On my way", "Need backup", "Location confirmed")

**Features:**
- **Typing indicators** — Shows "[Name] is typing…" in real time
- **Pin/Unpin messages** — Right-click any message to pin it for the whole room
- **Low-bandwidth mode** — Toggle in the nav bar to disable media previews and reduce data usage

**Who can use it:** All roles.

---

### 6.2 My Profile (`/profile`)

Personal account management — view and update your identity, role, and verification status.

**Account Info card:**
- Profile avatar (initials-based)
- Full name and email
- Current system role with a badge
- Change Role button (opens role selector for switching between Citizen / Volunteer / NGO)

**Verification Status card:**
- Checklist with three factors:
  - ✓ **Email Verified** — Confirmed via OTP
  - ✓ **Phone Verified** — Confirmed via SMS OTP
  - ✓ **Identity Verified** — Aadhaar verification (simulated)
- Each unverified item has a "Verify Now" link to `/verify`

**Reputation Summary card:**
- Trust Score (0–100)
- Quick stats: Reports Submitted, Verifications Given, Resources Provided, Upvotes Received
- "View Full Reputation" link to `/reputation`

**Who can use it:** All roles (each user sees their own profile only).

---

### 6.3 Verification (`/verify`)

A step-by-step identity verification workflow for increasing your trust level on the platform.

**Email Verification:**
- Enter the 6-digit OTP sent to your email address
- "Resend Code" button if the email was not received
- In development mode: the current OTP is displayed on screen for testing

**Phone Verification:**
- Enter your phone number
- Receive and enter the 6-digit SMS OTP
- In development mode: OTP shown on screen

**Aadhaar Verification (India):**
- Enter your 12-digit Aadhaar number
- Click "Verify Identity"
- Simulated in demo mode — any valid-format number is accepted

**Why verify?**
- Each completed verification step increases your Trust Score
- Verified users' reports carry more weight in the AI scoring
- Some volunteer roles require phone or identity verification

**Who can use it:** All roles.

---

### 6.4 Reputation (`/reputation`)

A gamified dashboard showing your contribution history and standing in the CrisisConnect community.

**Trust Score card:**
- Large numeric display (0–100) with a color-coded ring
- Trust Level label: **Building** (0–30) / **Fair** (31–50) / **Good** (51–75) / **Excellent** (76–100)
- Brief description of what your current level means

**Contribution Stats grid:**
- Total Reports Submitted
- Reports Verified (confirmed as accurate)
- False Reports (penalizes score)
- Verifications Given (reports you confirmed for others)
- Upvotes Received
- Resources Provided
- Accuracy Rate %

**Achievements panel:**
- Progress bars toward unlocking badges:
  - **Report Master** — Submit 10 verified reports
  - **Community Helper** — Give 25 verifications
  - **First Responder** — Complete 5 resource fulfillments
  - **Trusted Source** — Maintain 90%+ accuracy for 30 days
- Unlocked badges are shown in full color; in-progress ones are greyed with a progress %

**Tips section:**
- Suggestions for improving your score (e.g., "Verify 3 more reports to unlock Community Helper")

**Who can use it:** All roles.

---

### 6.5 Privacy & Data (`/compliance`)

A GDPR-compliant control center for managing your personal data rights and privacy settings.

**Four tabs:**

**Consents tab:**
- Toggle switches for each consent category:
  - **Data Processing** — Core platform functionality (required)
  - **Location Tracking** — GPS capture when submitting reports
  - **Analytics** — Anonymous usage statistics
  - **Communications** — Email and SMS notifications
  - **Third-Party Sharing** — Data sharing with partner agencies
- Each consent shows: current status, last updated timestamp, and consent version

**Data Export tab:**
- Overview of what is included in your personal data export (reports, SOS history, messages, profile data)
- Format: JSON
- **Request Export** button — generates a downloadable file of all your data

**Retention tab:**
- Table showing how long each data type is stored:
  - SOS Alerts: 2 years
  - Disaster Reports: 5 years
  - Chat Messages: 1 year
  - Audit Logs: 90 days
  - Analytics Events: 6 months
- Legal basis for each retention period

**Delete Account tab:**
- **Danger zone** — Permanently deletes your account and all associated data
- Requires typing your email address to confirm
- Irreversible action; data is wiped from the database

**Who can use it:** All roles (each user manages their own privacy settings).

---

## Quick Reference — Role Access Summary

| Page | Citizen | Volunteer | NGO | Government | Admin |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Active Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Interactive Map | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit Report | ✓ | ✓ | ✓ | ✓ | ✓ |
| My Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Volunteer Hub | — | ✓ | ✓ | ✓ | ✓ |
| Aid Matching | — | ✓ | ✓ | ✓ | ✓ |
| Matching Engine | — | — | ✓ | — | ✓ |
| Resource Requests | ✓ | ✓ | ✓ | ✓ | ✓ |
| Resource Management | — | — | ✓ | — | ✓ |
| Response Teams | — | ✓ | ✓ | ✓ | ✓ |
| Broadcast Alerts | — | — | ✓ | — | ✓ |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Intelligence | — | — | — | ✓ | ✓ |
| AI Copilot | ✓ | ✓ | ✓ | ✓ | ✓ |
| Risk Map | — | ✓ | ✓ | ✓ | ✓ |
| AI Audit | — | — | — | ✓ | ✓ |
| Multimodal AI | — | — | ✓ | ✓ | ✓ |
| Decision Engine | — | — | — | ✓ | ✓ |
| Simulation Engine | — | — | — | — | ✓ |
| Digital Twin | — | — | — | ✓ | ✓ |
| AI Override | — | — | — | ✓ | ✓ |
| AI Governance | — | — | — | ✓ | ✓ |
| Policy Engine | — | — | — | — | ✓ |
| Data Fusion | — | — | — | ✓ | ✓ |
| Executive View | — | — | — | ✓ | ✓ |
| Data Governance | — | — | — | — | ✓ |
| API Analytics | — | — | — | — | ✓ |
| Async Pipeline | — | — | — | — | ✓ |
| Adaptive Fusion | — | — | — | — | ✓ |
| Organizations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trust & Fraud | — | — | — | — | ✓ |
| Developer Platform | ✓ | ✓ | ✓ | ✓ | ✓ |
| Monitoring | — | — | — | — | ✓ |
| Messages | ✓ | ✓ | ✓ | ✓ | ✓ |
| My Profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verification | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reputation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Privacy & Data | ✓ | ✓ | ✓ | ✓ | ✓ |
