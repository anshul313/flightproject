# Installation
* Install nodejs 4.x
* Run `npm install`, if not already.

For checkin confirmed emails you need to disable google captcha by going to 
https://accounts.google.com/b/0/DisplayUnlockCaptcha
after spinning up the server.

# Development
* Copy ``rundevserver.sh.sample`` to ``rundevserver.sh``
* Edit ``rundevserver.sh`` and add the FCM key and a Hasura admin token for API token
* Make sure ``rundevserver.sh`` is not added to the git repo
* ``./rundevserver.sh`` and your dev server + JSlinting is up
