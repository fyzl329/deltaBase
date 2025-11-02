# DeltaBase

DeltaBase is an open, browser-based quiz engine for structured learning and exam preparation. It provides a unified interface for Physics, Chemistry, and Mathematics with modular chapters, real-time analytics, and dynamic content loading — all without paywalls, logins, or server dependencies.


## Philosophy

I believe study tools shouldn’t be gated, monetized, or hidden behind registration forms.  
DeltaBase is designed as a **completely open** and **freely accessible** system that anyone can deploy, extend, or modify.  
Every feature — from its question engine to performance metrics — is built to run locally, with transparent data handling and zero tracking.

Where most platforms trade simplicity for lock-in, DeltaBase stays lightweight, portable, and community-driven. Anyone can fork it, build their own subject modules, or integrate it into a classroom workflow.


## Key Advantages

- **Open Architecture:** All question data, logic, and styling are editable through plain files.  
- **No Server Costs:** Runs entirely on the client side — no backend or database needed.  
- **Free Forever:** Distributed under the MIT License. No subscriptions, no hidden APIs.  
- **Transparent Learning:** Educators and students can audit or extend how questions are processed.  
- **Competitive Edge:** Unlike closed quiz platforms, DeltaBase prioritizes independence over monetization.



## Core Features

- Dynamic loading of subject and chapter data from JSON.
- Multiple question formats (MCQ, numerical, short answer).
- Instant scoring and progress feedback.
- Graphical performance tracking powered by Chart.js.
- Persistent statistics through browser local storage.
- Responsive layout for desktop and mobile.



## Technology Stack

| Component | Technology |
|------------|-------------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Data Handling | JSON |
| Visualization | Chart.js |
| Deployment | GitHub Pages |



## Folder Structure
```python
deltaBase/
│
├── index.html # Main entry point
├── styles.css # Global styling
├── script.js # Core logic and question engine
├── /data/ # JSON question sets by subject/chapter
│ ├── physics/
│ ├── chemistry/
│ └── mathematics/
├── /assets/ # Icons, images, and visual assets
├── /docs/ # Optional documentation or static references
└── README.md
```