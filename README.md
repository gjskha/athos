# Gwiki

## INSTALL 

### pre-requisites

Gwiki requires a recent version of node, npm, and sqlite. Gwiki is known to work with 

Node is available here:

https://nodejs.org/en/download/

Download the pre-built installer for your platform, and follow the instructions. NPM is distributed with Node.

SQLite:

Installing the Node sqlite library will also install the sqlite binary with no intervention, but the sqlite download page for reference is here:

https://sqlite.org/download.html 

### install DB file

The code repo includes a sqlite database file ready to go.
To (re-)instantiate the database, go to the subdirectory 'db' and import the datadump.sql file like this:

$ sqlite3 database.db < database.dump

### install libraries

run `npm install` in the root level directory to install the libraries used by the application

# RUNNING 

1. run `npm start` to run the server.

2. In the browser, go to http://localhost:8081 to begin using the application.

3. Register an account at http://localhost:8081/register.

4. Browse to http://localhost:8081/login to login with your new username.

5. Alternatively, use the user/pass combo of demo/demo

6. Each wiki page has a View tab for viewing, Edit for editing, History for viewing diffs between versions, and Categories for manipulating category data for a page.
