## Install and Run (from a fresh clone)
iTimedIT

### Quick Start (
- Clone and install:
Open new window in cursor and clone
    https://github.com/Kieransaunders/iTimedIT
  
open termainl window in the bottom of curser to setup project

  npm install

Install Convex the database for local development: 
  npm install convex
  npx convex dev
  then select "❯ choose an existing project 
  ? Configure project iTimedIT (iTimedIT)? (Y/n) Y
  ```

To run server DB and Front end together:
Start new terminal window
npm run dev

Then open a new terminal windows and start claude with
Claude

Check Task.MD for any tasks to work on or test the recent ones developed.


To deploy to:http://itimedit.com/
   Make sure you are in the /apps/web folder
npx convex deploy

Also npx convex dev for syncing the database

Then 
  npx convex dev
  npm run dev
The site should deply in a few mins.




 
  
  ```
  Frontend: http://localhost:5173 (backend runs via Convex cloud dev)

### Prerequisites
- Node.js 18+ (recommend 20 LTS)
- npm 9+ (bundled with Node)
- A Convex account (`npx convex dev` will prompt login in browser if needed)

