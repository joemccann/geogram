Redis Store
===

Used for session storage for the app.
Need a redis-config.json file with the following:

```
{
    "name": "geogram-redis",
	"host": "YOUR_HOST,"
	"port": "YOUR_PORT",
	"auth": "YOUR_AUTH_STRING"
	"pass": "YOUR_PASSWORD"
}
```

To connect from CLI:

```
// On a Mac...
brew install redis 
redis-cli -h YOUR_HOST -p YOUR_PORT -a YOUR_AUTH_STRING
```

To connect from Node Redis module:

```
var redis = require('redis');
var client = redis.createClient(YOUR_PORT, 'YOUR_HOST');
client.auth('YOUR_AUTH_STRING', function (err) {
    if (err) { throw err; }
	// You are now connected to your redis.
});
```