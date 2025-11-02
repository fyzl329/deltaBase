# DeltaBase

**DeltaBase** is an open-source quiz engine and learning platform built for students, self-learners, and developers who actually care about how things work. It’s fast, modular, and completely free, and it's built to prove that open tools and transparency can outperform every overpriced, closed-off alternative.

## Overview

DeltaBase unifies quizzes, analytics, and performance tracking under one lightweight web interface. Everything runs locally, loads instantly, and stays simple enough to modify without a thousand dependencies.

This project was made by me, for people like me — the ones who’d rather build their own tools than rely on something bloated and restricted. It’s about giving control back to the user. (*viva la comuna* I guess?)

## Features

- Modular quiz system — load any subject or chapter dynamically  
- Adaptive difficulty — tracks your stats and adjusts questions accordingly  
- Multiple question types — MCQs, numericals, true/false, and more  
- Instant analytics — live accuracy, progress, and performance graphs  
- Search and filter — find chapters or topics instantly  
- JSON-based data — easy to edit, expand, or import  
- Offline support — runs directly from your browser or a local server  
- Lightweight — written in pure JavaScript with no unnecessary frameworks  

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)  
- **Data Handling:** JSON-based modular storage  
- **Visualization:** Canvas or Chart.js  
- **Deployment:** GitHub Pages or any static host  

## How It Works

Each subject folder contains chapter data and question sets in JSON.  
The engine fetches these dynamically, renders them in a clean UI, and tracks your performance locally.  

No backend, no accounts, no surveillance. Just a clean client-side architecture that does its job well.

## Philosophy

DeltaBase is completely free — for schools, students, educators, and developers.  
No hidden features, no paid upgrades, no telemetry.  

It’s open so anyone can understand it, change it, or improve it. Because learning platforms should belong to the people who use them, not the ones who monetize them.

## Getting Started

**1. Clone or download the repository**
```bash
git clone https://github.com/fyzl329/deltaBase.git
```

**2. Run locally**
```bash
npx serve
```

**3. Add your own content**  
Place your JSON chapter files inside `/data/<subject>` and reload. DeltaBase will detect and display them automatically.

## Roadmap

- Optional user login and progress sync  
- Advanced analytics and custom dashboards  
- Question and quiz generator tools  
- Import/export for question sets  
- Mobile layout and accessibility updates  

## Contributing

Contributions are open to anyone who shares the same mindset: simple, fast, and transparent code.  
Fork the repository, make your improvements, and open a pull request with a clear description.

## License

**MIT License** — use, modify, and distribute freely.  
Just keep it open and honest.

## Credits

Created by **Fayazul** for students and developers.  
Built with patience, and a bit of scrambling through javascript documentation.
