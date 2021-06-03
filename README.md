# Gwiki

## INSTALL 

### pre-requisites

Gwiki requires a recent version of Node, NPM, and SQLite. Gwiki is known to work with Node 14.16.1, NPM 6.14.12 and SQLite 3.35.5.

#### Node

Node is available here:

https://nodejs.org/en/download/

Download the pre-built installer for your platform, and follow the instructions. NPM is distributed with Node. 

### install libraries

run `npm install` in the root level directory to install the libraries used by the application.

#### SQLite

Installing the Node sqlite libraries will also install the sqlite binary with no intervention, but the sqlite download page for reference is here:

https://sqlite.org/download.html 

### install DB file

The code repo includes a sqlite database file ready to go.

If necessary, to (re-)instantiate the database, go to the subdirectory 'db' and import the datadump.sql file like this:

`$ sqlite3 database.db < database.dump`

# RUNNING 

1. run `npm start` to run the server.

2. In the browser, go to http://localhost:8081 to begin using the application. Make sure you have Internet access for third-party CDN usage.

3. To begin, register an account at http://localhost:8081/register. It will log you in upon success.

4. You can also go to http://localhost:8081/login to login with your username.

5. Alternatively, use the built in user/pass combo of demo/demo

6. Each wiki page has a View tab for viewing, Edit for editing, History for viewing diffs between versions, and Categories for manipulating category data for a page.
