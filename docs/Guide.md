## Install and Run (from a fresh clone)
iTimedIT

### Quick Start (
- Clone and install:
Open new window in cursor and clone
    https://github.com/Kieransaunders/iTimedIT
  
### open termainl window in the bottom of curser to setup project
### This is to install all the packages for project
  npm install 

### Install Convex the database for local development: 
  npm install convex
  npx convex dev
  then select "❯ choose an existing project 
  ? Configure project iTimedIT (iTimedIT)? (Y/n) Y


### ### To run server DB and Front end together:
### Make sure you are oin the web folder /apps/web
### Start new terminal window
### for syncing the database
### Important you must be on the latest branch / version so do a sync
npx convex dev  (`npx convex dev` will prompt login in browser to convex if needed)
npm run dev


### ** Important: **

Use the convex MCP to give claude a convex tool:
Terminal command
claude mcp add-json convex '{"type":"stdio","command":"npx","args":["convex","mcp","start"]}'
claude mcp get convex

also playright to allow it to open browser
https://github.com/microsoft/playwright-mcp
Terminal command
claude mcp add playwright npx @playwright/mcp@latest

Check MCP areinsalled by running claude and using the slash commands 
/mcp

then ask for the tools to be used
ex: Use your convex mcp tool to check the production db against my development db
ex: add a schedule to convex using your tool to delete guest users after 24 hours 


### 🎯 Development Commands from root
Web app: npm run dev:web
Mobile app: npm run dev:mobile
Build web: npm run build:web
Build mobile: npm run build:mobile
Run tests: npm run test
Lint all: npm run lint




###  To deploy to: http://itimedit.com/
   Make sure you are in the /apps/web folder
npx convex deploy
The site should deploy in a few mins.
