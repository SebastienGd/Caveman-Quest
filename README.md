# Caveman Quest RPG

Caveman Quest is a digital adaptation (full-stack web application) of the RPG board game developed as part of the LOG2990 course. Collaborators: Simon Asmar, Sarah Ait-Ali-Yahia, Jordan Filion, Cerine Ouchene, Rami Medjdoubi.

## Prerequisites

* **Node.js** v16 or higher
* **npm** (or **Yarn**)

## Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/SebastienGd/Caveman-Quest.git
   cd Caveman-Quest
   ```

2. **Install dependencies** 

   ```bash
   cd client   && npm install
   cd ../server && npm install
   cd ..
   ```

## Development

### Start Both Client & Server

```bash
# In one terminal
cd server
npm start

# In another
cd client
npm start
```

Then visit the client URL to play.

## Build for Production

```bash
npm run build
```

Outputs optimized bundles in each package’s `dist/` directory.

## Clean

Remove build artifacts from all packages:

```bash
npm run clean
```

## Project Structure

* **client/** – Front-end app (TypeScript, SCSS, HTML)
* **common/** – Shared models & utilities
* **server/** – Back-end app (TypeScript, Node.js)
