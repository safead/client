Safe.ad client application
============

Decentralized Email Service and Cloud Storage with End-To-End Encryption

Quick Start
-----------

* Download & Install GIT (https://git-scm.com/downloads) & Node.js (https://nodejs.org) for your platform.

* Clone the repo
  > ```
  > git clone https://github.com/safead/client.git
  > ```

* Install project dependencies, run from the project root
  > ```
  > npm install
  > ```

* [optional] Install **ssl/localhost.crt** as a trusted certificate into your browser.

* Now start dev server, run from the project root
  > ```
  > npm start
  > ```

* Navigate to (http://localhost:8888) or https if cert is installed.

* Enjoy...

Project floder structure
------------------------

* **dist/** - project build, intended for deployment onto public web server;

* **ssl/localhost.crt** - dev server certificate;

* **ssl/localhost.key** - dev server certificate key;

* **pub/** - public files to be copied into **dist/** as is;

* **src/** - files to be compiled/preprocessed prior to deployment;

  * **src/css** - style sources (less/sass/whatever);

  * **src/js** - client-side codebase;

* **LICENSE** - license;

* **gulpfile.js** - project build & config;

* **package.json** - project meta for `npm`;

* **README.md** - this file.
