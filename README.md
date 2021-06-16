1. Set up the environment

Ensure you have the Node environment installed. Commands will be executed through the npm command, which comes with Node.  Gwiki is known to work with Node 14.16.1, NPM 6.14.12 and SQLite 3.35.5.

Node is available here: https://nodejs.org/en/download/

Download the pre-built installer for your platform, and follow the instructions.

2. Installing supporting libraries

run  this command in the root level directory to install the libraries used by the application:

`$ npm install`

3. Installing SQLite

Installing the supporting libraries in the step above will also install the SQLite binary with no intervention. However, on the possibility it has to be installed separately, the SQLite download page is here: https://sqlite.org/download.html

4. Importing data into SQLite (optional)

The code repo includes a SQLite database file ready to go. You don't have do anything. However, if necessary, to (re-)instantiate the database, go to the subdirectory 'db' and import the datadump.sql file like this:

`$ sqlite3 database.db < DATABASE.DUMP`

6. Running the server

In the root level of the code repo type this into a console:

`$ npm start`

The server should now start.
